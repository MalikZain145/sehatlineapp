// Report to Admin — full page (was a modal). Sends a message to hospital admin.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import DoctorHeader from '../components/DoctorHeader';
import doctorService from '../services/doctorService';
import { showInfo } from '../../../components/confirm';
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function DoctorReportScreen({ navigation }) {
  const { colors: COLORS } = useTheme();
  const styles = makeStyles(COLORS);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const msg = text.trim();
    if (!msg) {
      showInfo({ title: 'Empty', message: 'Please write your report before sending.', icon: 'alert-circle' });
      return;
    }
    setSending(true);
    try {
      const res = await doctorService.reportToAdmin(msg);
      setText('');
      showInfo({ title: 'Report Sent', message: res?.message || 'Your report has been sent to the admin.', icon: 'checkmark-circle', onClose: () => navigation.goBack() });
    } catch (e) {
      showInfo({ title: 'Failed', message: e?.message || 'Could not send your report. Please try again.', icon: 'alert-circle' });
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={COLORS.mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={COLORS.background} />
      <DoctorHeader title="Report to Admin" navigation={navigation} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.iconWrap}>
            <Ionicons name="flag" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.sub}>Write your message. It will be sent to the hospital administration for review.</Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Describe the issue or feedback…"
            placeholderTextColor={COLORS.textLight}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity style={[styles.btn, { opacity: sending ? 0.7 : 1 }]} onPress={submit} disabled={sending} activeOpacity={0.85}>
            {sending ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <Ionicons name="send" size={18} color="#FFFFFF" />
                <Text style={styles.btnText}>Send to Admin</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (COLORS) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingBottom: BOTTOM_SPACE },
  content: { padding: 20, paddingBottom: 40 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary + '18',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  sub: { fontSize: 14, lineHeight: 21, color: COLORS.textSecondary, marginBottom: 16 },
  input: {
    minHeight: 160, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.card, color: COLORS.text, padding: 16, fontSize: 15,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, marginTop: 22,
  },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
