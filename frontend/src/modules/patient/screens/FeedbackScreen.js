// FeedbackScreen — tell the hospital what's working and what isn't.
//
// The old version was styled for a dark theme the app no longer uses, and its
// submit button showed a thank-you without sending anything. Feedback now
// reaches the server and is stored against the account.
//
// A category is asked for because "the app is slow" and "the queue was
// mismanaged" go to different people.

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, Platform, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import ScreenHeader from '../../../components/ui/ScreenHeader';
import useBottomInset from '../../../hooks/useBottomInset';
import ThemedPrompt from '../../../components/common/ThemedPrompt';
import settingsService from '../services/settingsService';
import { APP_VERSION } from '../../../constants/version';
import { useTheme } from "../../../context/ThemeContext";
const CATEGORIES = [{
  key: 'app',
  label: 'The App',
  icon: 'phone-portrait-outline'
}, {
  key: 'queue',
  label: 'Queue & Tokens',
  icon: 'time-outline'
}, {
  key: 'staff',
  label: 'Staff',
  icon: 'people-outline'
}, {
  key: 'facilities',
  label: 'Facilities',
  icon: 'business-outline'
}, {
  key: 'other',
  label: 'Something Else',
  icon: 'ellipsis-horizontal'
}];

// What each score means, so the number isn't guesswork.
const RATING_LABELS = ['', 'Poor', 'Not great', 'Fine', 'Good', 'Excellent'];
export default function FeedbackScreen({
  navigation
}) {
  const {
    colors: COLORS
  } = useTheme();
  const styles = makeStyles(COLORS);
  const bottomInset = useBottomInset(70);
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('app');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [prompt, setPrompt] = useState(null);
  const submit = async () => {
    setError('');
    if (!rating) {
      setError('Choose a rating first.');
      return;
    }
    setBusy(true);
    try {
      await settingsService.submitRating({
        rating,
        category,
        comment: comment.trim(),
        appVersion: APP_VERSION,
        platform: Platform.OS
      });
      setBusy(false);
      setPrompt({
        variant: 'success',
        title: 'Thank You',
        message: 'Your feedback has been recorded. The hospital reads every message.',
        onPrimary: () => {
          setPrompt(null);
          navigation.goBack();
        }
      });
    } catch (e) {
      setBusy(false);
      setError(e.message || 'Could not send your feedback. Please try again.');
    }
  };
  return <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === "dark" ? "light-content" : "dark-content"} backgroundColor={COLORS.card} />
      <ScreenHeader title="Send Feedback" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView style={{
      flex: 1
    }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {/* Rating */}
          <View style={styles.card}>
            <Text style={styles.question}>How was your experience?</Text>

            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(n => <TouchableOpacity key={n} onPress={() => {
              setRating(n);
              setError('');
            }} hitSlop={{
              top: 8,
              bottom: 8,
              left: 4,
              right: 4
            }} activeOpacity={0.7}>
                  <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={34} color={n <= rating ? COLORS.warning : COLORS.border} style={styles.star} />
                </TouchableOpacity>)}
            </View>

            <Text style={[styles.ratingLabel, !rating && styles.ratingLabelIdle]}>
              {rating ? RATING_LABELS[rating] : 'Tap a star'}
            </Text>
          </View>

          {/* Category */}
          <Text style={styles.sectionTitle}>What is this about?</Text>
          <View style={styles.chips}>
            {CATEGORIES.map(c => {
            const active = category === c.key;
            return <TouchableOpacity key={c.key} style={[styles.chip, active && styles.chipActive]} onPress={() => setCategory(c.key)} activeOpacity={0.8}>
                  <Ionicons name={c.icon} size={15} color={active ? '#FFF' : COLORS.textSecondary} />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                </TouchableOpacity>;
          })}
          </View>

          {/* Comment */}
          <Text style={styles.sectionTitle}>
            Tell us more <Text style={styles.optional}>(optional)</Text>
          </Text>
          <View style={styles.commentBox}>
            <TextInput style={styles.comment} value={comment} onChangeText={setComment} placeholder="What went well? What should we fix?" placeholderTextColor="#9CA3AF" multiline maxLength={2000} textAlignVertical="top" />
            <Text style={styles.counter}>{comment.length}/2000</Text>
          </View>

          {!!error && <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color={COLORS.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>}

          {/* Submit */}
          <TouchableOpacity style={[styles.submit, (!rating || busy) && styles.submitDisabled]} onPress={submit} disabled={!rating || busy} activeOpacity={0.85}>
            {busy ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.submitText}>Send Feedback</Text>}
          </TouchableOpacity>

          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.textLight} />
            <Text style={styles.noteText}>
              Sent with your account, so we can follow up if needed. For anything urgent,
              use Help & Support instead.
            </Text>
          </View>

          {/* Room for the keyboard. */}
          <View style={{
          height: bottomInset
        }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ThemedPrompt visible={!!prompt} variant={prompt?.variant} title={prompt?.title} message={prompt?.message} primaryLabel="Done" onPrimary={prompt?.onPrimary || (() => setPrompt(null))} />
    </View>;
}
const makeStyles = COLORS => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary
  },
  scroll: {
    padding: 16
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    alignItems: 'center',
    marginBottom: 22
  },
  question: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 18
  },
  stars: {
    flexDirection: 'row',
    gap: 4
  },
  star: {
    marginHorizontal: 2
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.warning,
    marginTop: 12,
    minHeight: 18
  },
  ratingLabelIdle: {
    color: COLORS.textLight,
    fontWeight: '500'
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    marginLeft: 2
  },
  optional: {
    fontSize: 11.5,
    color: COLORS.textLight,
    fontWeight: '500'
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  chipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  chipTextActive: {
    color: '#FFF'
  },
  commentBox: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 6
  },
  comment: {
    fontSize: 13.5,
    color: COLORS.text,
    minHeight: 110,
    lineHeight: 20,
    padding: 0
  },
  counter: {
    fontSize: 10.5,
    color: COLORS.textLight,
    textAlign: 'right',
    marginTop: 6
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FDECEC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '500'
  },
  submit: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18
  },
  submitDisabled: {
    opacity: 0.5
  },
  submitText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14.5
  },
  note: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 16,
    paddingHorizontal: 4
  },
  noteText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textLight,
    lineHeight: 16
  }
});