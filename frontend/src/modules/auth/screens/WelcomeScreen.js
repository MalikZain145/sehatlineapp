import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
// SafeAreaView from react-native is deprecated; this one handles notches
// and the Android gesture bar correctly.
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { COLORS, SIZES, SHADOWS } from '../../../theme';
import { APP_VERSION_LABEL } from '../../../constants/version';

const { width } = Dimensions.get('window');

const WelcomeScreen = ({ navigation }) => {
  // Gentle animation values
  const fadeIn = useSharedValue(0);
  const logoTranslate = useSharedValue(20);
  const titleTranslate = useSharedValue(20);
  const cdaTranslate = useSharedValue(20);
  const buttonTranslate = useSharedValue(20);
  const haloPulse = useSharedValue(0);
  // Logo color fill: 0 = empty (gray), 1 = fully filled (color), bottom→top
  const fillProgress = useSharedValue(0);

  // How long the logo fill takes before the rest of the screen appears.
  const FILL_MS = 1800;

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);

    // Logo appears immediately, then fills bottom → top.
    fadeIn.value = withTiming(1, { duration: 700, easing: ease });
    logoTranslate.value = withTiming(0, { duration: 700, easing: ease });
    fillProgress.value = withTiming(1, { duration: FILL_MS, easing: Easing.inOut(Easing.ease) });

    // Title / badge / button fade in AFTER the fill completes.
    titleTranslate.value = withDelay(
      FILL_MS + 100,
      withTiming(0, { duration: 700, easing: ease })
    );
    cdaTranslate.value = withDelay(
      FILL_MS + 350,
      withTiming(0, { duration: 700, easing: ease })
    );
    buttonTranslate.value = withDelay(
      FILL_MS + 550,
      withTiming(0, { duration: 700, easing: ease })
    );

    // Soft halo breathing
    haloPulse.value = withRepeat(
      withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedLogoStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ translateY: logoTranslate.value }],
  }));

  // The color logo is revealed from the bottom up as fillProgress goes 0→1.
  // NOTE: animate a NUMERIC height (the logo box is 64px), NOT a percentage
  // string. Percentage layout animations are unreliable under Reanimated v4 +
  // the New Architecture on iOS (they can silently stall the UI-thread runtime,
  // which would also freeze the staged button reveal below and trap the user on
  // this screen). A numeric height animates cleanly on both platforms.
  const LOGO_BOX = 64;
  const animatedFillStyle = useAnimatedStyle(() => ({
    height: fillProgress.value * LOGO_BOX,
  }));

  // Title/badge/button start hidden (opacity 0) until their delay fires.
  const titleFade = useSharedValue(0);
  const cdaFade = useSharedValue(0);
  const buttonFade = useSharedValue(0);
  useEffect(() => {
    titleFade.value = withDelay(FILL_MS + 100, withTiming(1, { duration: 700 }));
    cdaFade.value = withDelay(FILL_MS + 350, withTiming(1, { duration: 700 }));
    buttonFade.value = withDelay(FILL_MS + 550, withTiming(1, { duration: 700 }));
  }, []);

  const animatedHaloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(haloPulse.value, [0, 1], [0.2, 0.5]),
    transform: [{ scale: interpolate(haloPulse.value, [0, 1], [1, 1.08]) }],
  }));

  const animatedHaloOuterStyle = useAnimatedStyle(() => ({
    opacity: interpolate(haloPulse.value, [0, 1], [0.12, 0.3]),
    transform: [{ scale: interpolate(haloPulse.value, [0, 1], [1.05, 1.18]) }],
  }));

  const animatedTitleStyle = useAnimatedStyle(() => ({
    opacity: titleFade.value,
    transform: [{ translateY: titleTranslate.value }],
  }));

  const animatedCdaStyle = useAnimatedStyle(() => ({
    opacity: cdaFade.value,
    transform: [{ translateY: cdaTranslate.value }],
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    opacity: buttonFade.value,
    transform: [{ translateY: buttonTranslate.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[COLORS.primary, COLORS.background, COLORS.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <SafeAreaView style={styles.content}>
          {/* CENTER — LOGO (fills bottom→top) + TITLE */}
          <View style={styles.centerSection}>
            <Animated.View style={[styles.logoStack, animatedLogoStyle]}>
              <Animated.View style={[styles.haloOuter, animatedHaloOuterStyle]} />
              <Animated.View style={[styles.halo, animatedHaloStyle]} />

              {/* Logo fill: gray silhouette behind, color revealed from bottom */}
              <View style={styles.fillLogoWrap}>
                <Image
                  source={require('../../../assets/logo-empty.png')}
                  style={styles.fillLogo}
                  resizeMode="contain"
                />
                <Animated.View style={[styles.fillReveal, animatedFillStyle]}>
                  <Image
                    source={require('../../../assets/logo-transparent.png')}
                    style={[styles.fillLogo, styles.fillRevealImage]}
                    resizeMode="contain"
                  />
                </Animated.View>
              </View>
            </Animated.View>

            {/* TITLE */}
            <Animated.View style={[styles.titleGroup, animatedTitleStyle]}>
              <Text style={styles.title}>
                SEHAT<Text style={styles.titleWhite}>LINE</Text>
              </Text>
              <View style={styles.dividerLine} />
              <Text style={styles.subtitle}>Your Health, One Tap Away</Text>
              <Text style={styles.description}>
                A gentle companion for your everyday healthcare needs.
              </Text>
            </Animated.View>
          </View>

          {/* BOTTOM — CDA + BUTTON */}
          <View style={styles.bottomSection}>
            <Animated.View style={[styles.cdaBadge, animatedCdaStyle]}>
              <Text style={styles.cdaText}>CDA Hospital, Islamabad</Text>
            </Animated.View>

            <Animated.View style={[styles.buttonWrap, animatedButtonStyle]}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.buttonShadow}
                onPress={() => navigation.navigate('Signup')}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.secondary]}
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 0 }}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>Get Started</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={SIZES.iconMedium}
                    color={COLORS.white}
                    style={{ marginLeft: SIZES.sm }}
                  />
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.versionText}>{APP_VERSION_LABEL}</Text>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  gradientBackground: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + SIZES.xs : SIZES.xs,
    paddingHorizontal: SIZES.xl,
  },

  /* CENTER — LOGO + TITLE */
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* LOGO STACK */
  logoStack: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Logo fill effect (bottom → top color reveal)
  // Sized to the 124px ring it sits inside, not the 150px halo.
  fillLogoWrap: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fillLogo: {
    width: 64,
    height: 64,
  },
  // Mask must match the logo box, or it clips the wrong region.
  fillReveal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 64,
    overflow: 'hidden',
  },
  fillRevealImage: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  haloOuter: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  halo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  logoOuterRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 12,
  },
  logoGradientRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  logoInnerCircle: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 118,
    height: 118,
    resizeMode: 'cover',
  },

  /* TITLE */
  titleGroup: {
    alignItems: 'center',
    marginTop: SIZES.xxl,
  },
  title: {
    color: COLORS.primary,
    fontSize: SIZES.h1 + 10,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: COLORS.shadowDark,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  titleWhite: {
    color: COLORS.text,
    fontWeight: '800',
  },
  dividerLine: {
    width: 50,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusSm,
    marginVertical: SIZES.md,
  },
  subtitle: {
    color: COLORS.secondary,
    fontSize: SIZES.body,
    letterSpacing: 1,
    fontWeight: '700',
    textShadowColor: COLORS.shadowDark,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    color: '#1E293B', // dark slate
    fontSize: SIZES.small + 0.5,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: SIZES.sm,
    paddingHorizontal: SIZES.xxl + 6,
    fontWeight: '600',
  },

  /* BOTTOM */
  bottomSection: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? SIZES.xxxl + 24 : SIZES.xxxl + 16,
  },
  cdaBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.xl + 2,
  },
  cdaText: {
    color: COLORS.primary, // teal
    fontSize: SIZES.body,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  buttonWrap: {
    width: '80%',
    alignItems: 'center',
  },
  buttonShadow: {
    width: '100%',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
    borderRadius: SIZES.radiusXl + 6,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: SIZES.lg,
    borderRadius: SIZES.radiusXl + 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: SIZES.h4,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  versionText: {
    marginTop: SIZES.md,
    color: '#1E293B', // dark slate
    fontSize: SIZES.xSmall,
    letterSpacing: 1,
    fontWeight: '600',
  },
});

export default WelcomeScreen;