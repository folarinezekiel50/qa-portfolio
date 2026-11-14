/**
 * Local Expo config plugin that prepares the generated Android project for Detox.
 * Replaces the unmaintained @config-plugins/detox package (which only supports Expo SDK 53).
 *
 * Runs automatically during `npx expo prebuild` and:
 *  1. adds Detox's bundled Maven repo to android/build.gradle
 *  2. adds the test runner + Detox dependency to android/app/build.gradle
 *  3. creates the DetoxTest.java instrumentation test
 *  4. allows plain HTTP to the mock server (10.0.2.2 / localhost) only
 */
const fs = require('fs');
const path = require('path');
const {
  withProjectBuildGradle,
  withAppBuildGradle,
  withAndroidManifest,
  withDangerousMod,
} = require('expo/config-plugins');

const DETOX_REPO = 'maven { url("$rootDir/../node_modules/detox/Detox-android") }';

function addDetoxRepo(config) {
  return withProjectBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (!src.includes('Detox-android')) {
      const re = /allprojects\s*\{\s*repositories\s*\{/;
      if (!re.test(src)) throw new Error('[withDetox] Could not find allprojects.repositories in android/build.gradle');
      src = src.replace(re, (m) => `${m}\n        ${DETOX_REPO}`);
    }
    cfg.modResults.contents = src;
    return cfg;
  });
}

function addAppGradle(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (!src.includes('testBuildType System.getProperty')) {
      src = src.replace(/defaultConfig\s*\{/, (m) =>
        `${m}\n        testBuildType System.getProperty('testBuildType', 'debug')\n        testInstrumentationRunner 'androidx.test.runner.AndroidJUnitRunner'`);
    }
    if (!src.includes("com.wix:detox")) {
      src = src.replace(/\ndependencies\s*\{/, (m) => `${m}\n    androidTestImplementation('com.wix:detox:+')`);
    }
    cfg.modResults.contents = src;
    return cfg;
  });
}

function addDetoxTestAndNetworkConfig(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const pkg = cfg.android?.package;
      if (!pkg) throw new Error('[withDetox] android.package must be set in app.json');
      const root = cfg.modRequest.platformProjectRoot;

      const testDir = path.join(root, 'app/src/androidTest/java', ...pkg.split('.'));
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, 'DetoxTest.java'), `package ${pkg};

import com.wix.detox.Detox;
import com.wix.detox.config.DetoxConfig;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;
import androidx.test.rule.ActivityTestRule;

@RunWith(AndroidJUnit4.class)
@LargeTest
public class DetoxTest {
    @Rule
    public ActivityTestRule<MainActivity> mActivityRule = new ActivityTestRule<>(MainActivity.class, false, false);

    @Test
    public void runDetoxTests() {
        DetoxConfig detoxConfig = new DetoxConfig();
        detoxConfig.idlePolicyConfig.masterTimeoutSec = 90;
        detoxConfig.idlePolicyConfig.idleResourceTimeoutSec = 60;
        detoxConfig.rnContextLoadTimeoutSec = (BuildConfig.DEBUG ? 180 : 60);
        Detox.runTests(mActivityRule, detoxConfig);
    }
}
`);

      const xmlDir = path.join(root, 'app/src/main/res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">localhost</domain>
    </domain-config>
</network-security-config>
`);
      return cfg;
    },
  ]);
}

function useNetworkConfig(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });
}

module.exports = function withDetox(config) {
  config = addDetoxRepo(config);
  config = addAppGradle(config);
  config = addDetoxTestAndNetworkConfig(config);
  config = useNetworkConfig(config);
  return config;
};
