import React, { useState, useEffect, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { FirebaseError } from 'firebase/app';
import { useAuth } from '../firebase/AuthContext';
import { theme } from '../styles/theme';
import { checkUsernameAvailability, checkEmailAvailability } from '../firebase/auth';
import debounce from 'lodash/debounce';
import RankedBackground from '../components/RankedBackground';

const POSITIVE_MESSAGES = [
  "wow, that's a great username",
  "beautiful choice",
  "i can't believe i didn't think of that first",
  "looks good!",
  "yeah that username wasn't taken, i can see why...",
  "i like it!",
  "nice choice!",
  "wow... that's a really good one.",
  "ok this one sucks",
  "you are a genius, this name is perfect",
  "a name is but a label; meaning rests in essence, not in sound"
];

const ERROR_MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password',
  'auth/invalid-email': 'Please enter a valid email address',
  'auth/user-disabled': 'This account has been disabled',
  'auth/user-not-found': 'No account found with this email',
  'auth/wrong-password': 'Incorrect email or password',
  'auth/too-many-requests': 'Too many attempts. Please try again later',
  'auth/email-already-in-use': 'An account with this email already exists',
  'auth/weak-password': 'Password should be at least 6 characters',
} as const;

const USERNAME_REGEX = /^[a-zA-Z0-9._]+$/;
const USERNAME_REQUIREMENTS = "Username can only contain letters, numbers, periods, and underscores";

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Debounced validation functions
  const validateUsername = useMemo(
    () =>
      debounce(async (username: string) => {
        if (!username.trim()) {
          setUsernameError(null);
          setSuccessMessage(null);
          return;
        }

        // Check length
        if (username.length < 3) {
          setUsernameError('Username must be at least 3 characters');
          setSuccessMessage(null);
          return;
        }

        // Check format
        if (!USERNAME_REGEX.test(username)) {
          setUsernameError(USERNAME_REQUIREMENTS);
          setSuccessMessage(null);
          return;
        }

        // Check availability
        const isAvailable = await checkUsernameAvailability(username);
        if (isAvailable) {
          setUsernameError(null);
          const randomMessage = POSITIVE_MESSAGES[Math.floor(Math.random() * POSITIVE_MESSAGES.length)];
          setSuccessMessage(randomMessage);
        } else {
          setUsernameError('Username is already taken');
          setSuccessMessage(null);
        }
      }, 500),
    []
  );

  const validateEmail = useMemo(
    () =>
      debounce(async (email: string) => {
        if (!email.trim()) {
          setEmailError(null);
          return;
        }
        if (!email.includes('@')) {
          setEmailError('Invalid email format');
          return;
        }
        const isAvailable = await checkEmailAvailability(email);
        setEmailError(isAvailable ? null : 'Email is already registered');
      }, 500),
    []
  );

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    return null;
  };

  // Trigger validation on input change
  useEffect(() => {
    if (isSignUp && username) {
      validateUsername(username);
    }
  }, [username, isSignUp]);

  useEffect(() => {
    if (isSignUp && email) {
      validateEmail(email);
    }
  }, [email, isSignUp]);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedUsername = username.trim();
    const trimmedFullName = fullName.trim();

    // Basic validation
    if (!trimmedEmail || !trimmedPassword || (isSignUp && (!trimmedUsername || !trimmedFullName))) {
      Alert.alert('Required Fields', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        if (!trimmedUsername || usernameError || emailError) {
          Alert.alert('Invalid Input', 'Please fix all errors before submitting');
          return;
        }
        await signUp(trimmedEmail, trimmedPassword, trimmedUsername.toLowerCase(), trimmedFullName);
      } else {
        await signIn(trimmedEmail, trimmedPassword);
      }
    } catch (error) {
      console.error('Auth error:', error);
      const authError = error as FirebaseError;
      const errorMessage = ERROR_MESSAGES[authError.code as keyof typeof ERROR_MESSAGES] 
        || 'Something went wrong. Please try again.';
      
      Alert.alert(
        isSignUp ? 'Sign Up Failed' : 'Sign In Failed',
        errorMessage,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <RankedBackground />
      <View style={styles.formContainer}>
        <Text style={styles.title}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
        {isSignUp && (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input]}
                placeholder="Full Name"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.input, 
                  usernameError && styles.inputError,
                  successMessage && styles.inputSuccess
                ]}
                placeholder="Username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              {usernameError && (
                <Text style={styles.errorText}>{usernameError}</Text>
              )}
              {successMessage && (
                <Text style={styles.successText}>{successMessage}</Text>
              )}
            </View>
          </>
        )}
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, emailError && styles.inputError]}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {emailError && isSignUp && (
            <Text style={styles.errorText}>{emailError}</Text>
          )}
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, passwordError && styles.inputError]}
            placeholder="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (isSignUp) {
                setPasswordError(validatePassword(text));
              }
            }}
            secureTextEntry
          />
          {passwordError && isSignUp && (
            <Text style={styles.errorText}>{passwordError}</Text>
          )}
        </View>
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          setIsSignUp(!isSignUp);
          setUsername('');
          setEmail('');
          setPassword('');
        }}>
          <Text style={styles.switchText}>
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 2,
    margin: 20,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  title: {
    fontSize: 24,
    fontFamily: theme.fonts.default,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: theme.colors.text,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    height: 50,
    borderColor: theme.colors.secondary,
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 2,
    fontSize: 16,
    backgroundColor: 'white',
    fontFamily: theme.fonts.default,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginTop: 4,
    fontFamily: theme.fonts.default,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 2,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontFamily: theme.fonts.default,
    color: theme.colors.buttonText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchText: {
    marginTop: 16,
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 15,
    fontFamily: theme.fonts.default,
  },
  inputSuccess: {
    borderColor: '#34C759',
    borderWidth: 1,
  },
  successText: {
    color: '#34C759',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
    fontFamily: theme.fonts.italic,
  },
  buttonDisabled: {
    opacity: 0.7,
    backgroundColor: theme.colors.secondary,
  },
});

export default LoginScreen;