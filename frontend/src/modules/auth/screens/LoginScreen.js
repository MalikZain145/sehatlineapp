import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Image, ActivityIndicator, Platform, Dimensions,
  KeyboardAvoidingView, StatusBar,
  ScrollView, TouchableWithoutFeedback, Keyboard, Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES, SHADOWS, FONTS } from '../../../theme';
import FadeInView from '../../../components/ui/FadeInView';
import AuthLogo from '../../../components/ui/AuthLogo';
import BottomWave from '../../../components/ui/BottomWave';
import authService from '../services/authService';
import { authenticateBiometric, hashToken } from '../../../utils/biometric';
import { ROLE_HOME_ROUTE } from '../../../constants';
import { api } from '../../../services/apiClient';
import { useSession } from '../../../context/SessionContext';
import { STATUS_BAR_HEIGHT } from '../../../utils/safeArea';

const { width, height } = Dimensions.get('window');

// Custom Toast Notification Component
const ToastNotification = ({ visible, message, type, onHide }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
      
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start(() => onHide());
      }, 3000);
    }
  }, [visible]);
  
  const getToastStyles = () => {
    switch(type) {
      case 'success':
        return {
          backgroundColor: COLORS.success,
          icon: 'checkmark-circle',
          textColor: COLORS.white,
          borderColor: COLORS.success,
        };
      case 'error':
        return {
          backgroundColor: COLORS.danger,
          icon: 'close-circle',
          textColor: COLORS.white,
          borderColor: COLORS.danger,
        };
      case 'warning':
        return {
          backgroundColor: COLORS.warning,
          icon: 'warning',
          textColor: COLORS.white,
          borderColor: COLORS.warning,
        };
      default:
        return {
          backgroundColor: COLORS.primary,
          icon: 'information-circle',
          textColor: COLORS.white,
          borderColor: COLORS.primary,
        };
    }
  };
  
  const toastStyle = getToastStyles();
  
  if (!visible) return null;
  
  return (
    <Animated.View style={[
      styles.toastContainer,
      {
        transform: [{ translateY }],
        opacity: opacity,
        backgroundColor: toastStyle.backgroundColor,
        borderLeftColor: toastStyle.borderColor,
      }
    ]}>
      <View style={styles.toastContent}>
        <Ionicons name={toastStyle.icon} size={24} color={toastStyle.textColor} />
        <Text style={[styles.toastMessage, { color: toastStyle.textColor }]}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const LoginScreen = ({ navigation }) => {
  const { onAuthenticated } = useSession();
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState({ visible: false, message: '', type: '' });
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  
  const passwordInputRef = useRef(null);

  // 🔥 FIX: Reset form when screen comes into focus (after logout)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Reset all fields
      setEmailOrPhone('');
      setPassword('');
      setShowPassword(false);
      setErrors({});
      setToast({ visible: false, message: '', type: '' });
    });

    return unsubscribe;
  }, [navigation]);

  // Detect role from email
  const detectRole = (email) => {
    if (!email) return 'patient';
    
    const emailLower = email.toLowerCase();
    
    // Admin detection
    if (emailLower.includes('admin') || 
        emailLower.includes('administrator') ||
        emailLower.includes('manager')) {
      return 'admin';
    }
    
    // Doctor detection
    if (emailLower.includes('doctor') || 
        emailLower.includes('dr.') ||
        emailLower.includes('physician')) {
      return 'doctor';
    }
    
    return 'patient';
  };

  const roleConfig = {
    patient: {
      name: 'Patient',
      icon: 'person-outline',
      color: COLORS.primary,
      bgColor: COLORS.primary + '15',
      navigateTo: 'PatientPortal',
      gradientColors: [COLORS.primary, COLORS.secondary],
      requiresSignup: true,
    },
    doctor: {
      name: 'Doctor',
      icon: 'medkit-outline',
      color: COLORS.warning,
      bgColor: COLORS.warning + '15',
      navigateTo: 'ManageDoctorsScreen',
      gradientColors: [COLORS.warning, '#F59E0B'],
      requiresSignup: false,
    },
    admin: {
      name: 'Admin',
      icon: 'shield-checkmark-outline',
      color: COLORS.appointment,
      bgColor: COLORS.appointment + '15',
      navigateTo: 'AdminDashboardScreen',
      gradientColors: [COLORS.appointment, '#7C3AED'],
      requiresSignup: false,
    }
  };

  const showToast = (message, type) => {
    setToast({ visible: true, message, type });
  };

  const validateEmailOrPhone = (value) => {
    if (!value) return 'Email or Phone is required';
    
    // Check if it's an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(value)) return '';
    
    // Check if it's a phone number (basic validation)
    const phoneRegex = /^[0-9+\-\s()]{7,15}$/;
    if (phoneRegex.test(value)) return '';
    
    return 'Enter a valid email or phone number';
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    return '';
  };

  // Check if user account exists in AsyncStorage
  const checkUserAccount = async (emailOrPhone) => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        if (userData.email && userData.email.toLowerCase() === emailOrPhone.toLowerCase()) {
          return true;
        }
        if (userData.phone && userData.phone === emailOrPhone) {
          return true;
        }
      }
      
      const registeredUsersString = await AsyncStorage.getItem('registeredUsers');
      if (registeredUsersString) {
        const registeredUsers = JSON.parse(registeredUsersString);
        return registeredUsers.some(user => 
          user.email.toLowerCase() === emailOrPhone.toLowerCase() ||
          user.phone === emailOrPhone
        );
      }
      
      return false;
    } catch (error) {
      return false;
    }
  };

  // Get user data by email or phone
  const getUserData = async (emailOrPhone) => {
    try {
      // First check registered users
      const registeredUsersString = await AsyncStorage.getItem('registeredUsers');
      if (registeredUsersString) {
        const registeredUsers = JSON.parse(registeredUsersString);
        const user = registeredUsers.find(u => 
          u.email.toLowerCase() === emailOrPhone.toLowerCase() ||
          u.phone === emailOrPhone
        );
        if (user) return user;
      }
      
      // If not found, check if it's a doctor or admin (pre-defined)
      const emailLower = emailOrPhone.toLowerCase();
      if (emailLower.includes('doctor') || emailLower.includes('dr.')) {
        return {
          name: emailOrPhone.split('@')[0] || 'Doctor',
          email: emailOrPhone,
          phone: '',
          role: 'doctor',
          joinDate: new Date().toLocaleDateString(),
        };
      }
      if (emailLower.includes('admin') || emailLower.includes('administrator') || emailLower.includes('manager')) {
        return {
          name: 'Administrator',
          email: emailOrPhone,
          phone: '',
          role: 'admin',
          joinDate: new Date().toLocaleDateString(),
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  // Save user to registered users list
  const saveUserToRegistered = async (userData) => {
    try {
      let registeredUsers = [];
      const existing = await AsyncStorage.getItem('registeredUsers');
      if (existing) {
        registeredUsers = JSON.parse(existing);
      }
      
      const exists = registeredUsers.some(u => u.email.toLowerCase() === userData.email.toLowerCase());
      if (!exists) {
        registeredUsers.push(userData);
        await AsyncStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
      }
    } catch (error) {
      // Silent fail
    }
  };

  // After any successful login, staff still on the shared default password are
  // sent to a blocking "set your password" screen (they cannot go back or reach
  // their portal until it is done). Everyone else goes straight to their home.
  const routeAfterLogin = (user) => {
    const role = user?.role || 'patient';
    const target = ROLE_HOME_ROUTE[role] || 'PatientPortal';
    if (user?.mustChangePassword) {
      navigation.reset({ index: 0, routes: [{ name: 'ForcePasswordChange', params: { role, target, userData: user } }] });
      return;
    }
    navigation.replace(target, { userData: user });
  };

  const handleLogin = async () => {
    const emailOrPhoneError = validateEmailOrPhone(emailOrPhone);
    const passwordError = validatePassword(password);

    setErrors({ emailOrPhone: emailOrPhoneError, password: passwordError });

    if (emailOrPhoneError || passwordError) {
      if (emailOrPhoneError) showToast(emailOrPhoneError, 'error');
      else if (passwordError) showToast(passwordError, 'error');
      return;
    }

    setLoading(true);
    try {
      const data = await authService.login({
        emailOrPhone: emailOrPhone.trim(),
        password,
      });

      onAuthenticated(data.user);
      setLoading(false);
      routeAfterLogin(data.user);
    } catch (err) {
      setLoading(false);
      if (err.code === 'NO_ACCOUNT') {
        showToast('No account found. Please sign up first.', 'warning');
        setTimeout(() => navigation.navigate('Signup'), 1200);
      } else {
        showToast(err.message || 'Login failed. Please try again.', 'error');
      }
    }
  };

  const handleFingerprintLogin = async () => {
    showToast('Scan your fingerprint…', 'info');

    // 1) Prompt the device biometric. If a different person's finger is used,
    //    the OS rejects it and we never get a token.
    const bio = await authenticateBiometric('Log in to SehatLine');
    if (!bio.success) {
      showToast(bio.message || 'Fingerprint not recognized.', 'error');
      return;
    }

    setLoading(true);
    try {
      // Store the hash locally for the x-fingerprint header (device binding).
      const fpHash = await hashToken(bio.deviceToken);
      await api.saveFingerprint(fpHash);

      // 2) Ask the backend to log in the account bound to this fingerprint.
      const data = await authService.fingerprintLogin({
        fingerprintToken: bio.deviceToken,
        email: emailOrPhone.includes('@') ? emailOrPhone.trim() : undefined,
      });

      onAuthenticated(data.user);
      setLoading(false);
      routeAfterLogin(data.user);
    } catch (err) {
      setLoading(false);
      if (err.code === 'FINGERPRINT_MISMATCH') {
        showToast('This fingerprint is not linked to any account. Log in with password first.', 'warning');
      } else {
        showToast(err.message || 'Fingerprint login failed.', 'error');
      }
    }
  };

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        
        {/* Background gradient layer (same size/treatment as SignupScreen) */}
        {/* Soft mint wave anchoring the bottom of the page */}
        <BottomWave />

        {/* Toast Notification */}
        <ToastNotification 
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast({ ...toast, visible: false })}
        />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.flexFill}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <ScrollView 
              contentContainerStyle={[
                styles.scrollContainer,
                isKeyboardVisible && styles.scrollContainerKeyboard
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {/* Brand mark (shared across all auth screens) */}
              <FadeInView delay={50}>
                <AuthLogo />
              </FadeInView>

              {/* Login Form */}
              <FadeInView delay={150}>
              <View style={styles.formContainer}>
                <View style={[styles.formCard, { borderColor: COLORS.primary + '20' }]}>
                  
                  {/* Email/Phone Input */}
                  <View style={styles.inputGroup}>
                    <View style={[styles.inputWrapper, errors.emailOrPhone && styles.inputError, { borderColor: COLORS.primary + '30' }]}>
                      <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
                      <TextInput
                        style={styles.input}
                        placeholder="Email or Phone Number"
                        placeholderTextColor={COLORS.textLight}
                        value={emailOrPhone}
                        onChangeText={(text) => { setEmailOrPhone(text); errors.emailOrPhone && setErrors({...errors, emailOrPhone: ''}); }}
                        keyboardType="default"
                        autoCapitalize="none"
                        returnKeyType="next"
                        onSubmitEditing={() => passwordInputRef.current?.focus()}
                        blurOnSubmit={false}
                      />
                    </View>
                    {errors.emailOrPhone && <Text style={styles.errorText}>{errors.emailOrPhone}</Text>}
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputGroup}>
                    <View style={[styles.inputWrapper, errors.password && styles.inputError, { borderColor: COLORS.primary + '30' }]}>
                      <Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} />
                      <TextInput
                        ref={passwordInputRef}
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor={COLORS.textLight}
                        value={password}
                        onChangeText={(text) => { setPassword(text); errors.password && setErrors({...errors, password: ''}); }}
                        secureTextEntry={!showPassword}
                        returnKeyType="done"
                        onSubmitEditing={handleLogin}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={COLORS.textLight} />
                      </TouchableOpacity>
                    </View>
                    {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                  </View>

                  {/* Forgot Password */}
                  <TouchableOpacity 
                    style={styles.forgotLink} 
                    onPress={() => navigation.navigate('ForgotPassword')}
                  >
                    <Text style={[styles.forgotText, { color: COLORS.primary }]}>Forgot Password?</Text>
                  </TouchableOpacity>

                  {/* Login Button */}
                  <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
                    <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.loginGradient}>
                      {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.loginText}>LOGIN</Text>}
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Sign Up Link */}
                  <View style={styles.signupContainer}>
                    <Text style={styles.signupText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                      <Text style={[styles.signupLink, { color: COLORS.primary }]}>Sign Up</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              </FadeInView>

              {/* Fingerprint - Outside Container */}
              <TouchableOpacity style={styles.fingerprintContainer} onPress={handleFingerprintLogin} activeOpacity={0.7}>
                <View style={[styles.fingerprintCircle, { borderColor: COLORS.primary + '40' }]}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.secondary]}
                    style={styles.fingerprintGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="finger-print" size={30} color={COLORS.white} />
                  </LinearGradient>
                </View>
                <Text style={[styles.fingerprintText, { color: COLORS.primary }]}>Use Fingerprint</Text>
              </TouchableOpacity>

            </ScrollView>
          </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  // Transparent so the gradient behind stays visible.
  flexFill: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  // Same as SignupScreen: an absolute layer, not a full-page wrapper.
  gradientBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
  scrollContainer: {
    flexGrow: 1,
    // Start from the top so the logo always sits on the gradient
    // (centering could push it below the 340px gradient on tall screens).
    justifyContent: 'flex-start',
    paddingHorizontal: SIZES.xl,
    // Pushed down so the logo/form sit a little lower, not glued to the top.
    paddingTop: Platform.OS === 'ios' ? 120 : 100,
    paddingBottom: Platform.OS === 'ios' ? 150 : 140,
  },
  scrollContainerKeyboard: {
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? STATUS_BAR_HEIGHT + 8 : 10,
  },

  // Toast Notification
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? STATUS_BAR_HEIGHT + 8 : 30,
    left: 20,
    right: 20,
    zIndex: 1000,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 4,
    ...SHADOWS.medium,
    minHeight: 52,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toastMessage: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 20,
  },

  // Logo Section with Backlight

  // Form Container
  formContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  // No box: transparent + no border/shadow so the form sits directly on the
  // screen instead of looking like a separate white card.
  formCard: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 4,
    borderWidth: 0,
  },

  // Input Styles
  inputGroup: {
    marginBottom: SIZES.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    // White fields to match the Signup / Forgot-password screens.
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: SIZES.md,
    height: 52,
    borderWidth: 1.5,
    marginBottom: 4,
  },
  inputError: {
    borderColor: COLORS.danger,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    marginLeft: 12,
    fontSize: SIZES.body,
    paddingVertical: Platform.OS === 'ios' ? 14 : 8,
    height: '100%',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 8,
  },

  // Forgot Password
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: SIZES.xl,
    marginTop: 2,
  },
  forgotText: {
    fontSize: SIZES.small,
    fontWeight: '600',
  },

  // Login Button
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: SIZES.lg,
    ...SHADOWS.button,
  },
  loginGradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: COLORS.white,
    fontSize: SIZES.h4,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // Sign Up
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: COLORS.textSecondary,
    fontSize: SIZES.body,
  },
  signupLink: {
    fontSize: SIZES.body,
    fontWeight: '700',
  },

  // Fingerprint
  fingerprintContainer: {
    alignItems: 'center',
    marginTop: height * 0.035,
    marginBottom: height * 0.015,
  },
  fingerprintCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    ...SHADOWS.small,
    overflow: 'hidden',
  },
  fingerprintGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fingerprintText: {
    fontSize: SIZES.small,
    fontWeight: '600',
    marginTop: 8,
    letterSpacing: 0.3,
  },

  // Version
  versionText: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 10.5,
    marginTop: 8,
    letterSpacing: 0.5,
  },
});

export default LoginScreen;