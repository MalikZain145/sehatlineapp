import React, { useState } from "react";
import {
  SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../Theme/themeContext";
import GradientHeader from "../components/common/GradientHeader";
import ThemedAlert from "../components/common/ThemedAlert";
import pharmacyService from "../services/pharmacyService";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function ReportAdminScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [alert, setAlert] = useState<any>({ visible: false });

  const submit = async () => {
    const msg = text.trim();
    if (!msg) {
      setAlert({ visible: true, variant: "error", title: "Empty", message: "Please write your report before sending." });
      return;
    }
    setSending(true);
    try {
      const res = await pharmacyService.reportToAdmin(msg);
      setText("");
      setAlert({ visible: true, variant: "success", title: "Report Sent", message: res?.message || "Your report has been sent to the admin.", onClose: () => navigation.goBack() });
    } catch (e: any) {
      setAlert({ visible: true, variant: "error", title: "Failed", message: e?.message || "Could not send your report. Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GradientHeader title="Report to Admin" subtitle="Send a message to hospital administration" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.primary + "18" }]}>
            <Ionicons name="flag" size={28} color={theme.colors.primary} />
          </View>
          <Text style={[styles.sub, { color: theme.colors.textSecondary }]}>
            Describe the issue or feedback. It will be delivered to the hospital administration.
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
            value={text}
            onChangeText={setText}
            placeholder="Write your message…"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: theme.colors.primary, opacity: sending ? 0.7 : 1 }]}
            onPress={submit}
            disabled={sending}
            activeOpacity={0.85}
          >
            {sending ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <Ionicons name="send" size={18} color="#FFFFFF" />
                <Text style={styles.btnText}>Send to Admin</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ThemedAlert
        visible={alert.visible}
        variant={alert.variant}
        title={alert.title}
        message={alert.message}
        onClose={() => { const cb = alert.onClose; setAlert({ visible: false }); cb && cb(); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingBottom: BOTTOM_SPACE },
  content: { padding: 20, paddingBottom: 40 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  sub: { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  input: { minHeight: 160, borderRadius: 14, borderWidth: 1, padding: 16, fontSize: 15 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 16, marginTop: 22 },
  btnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
});
