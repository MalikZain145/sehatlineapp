import React, { useState, useEffect } from "react";
import { SkeletonList } from '../../../components/ui/Skeleton';
import useMinLoading from '../../../hooks/useMinLoading';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import GradientHeader from "../components/common/GradientHeader";
import ThemedAlert from "../components/common/ThemedAlert";
import { useTheme } from "../Theme/themeContext";
import pharmacyService from "../services/pharmacyService";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function RequisitionScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const [loading, setLoading] = useMinLoading(true);
  useEffect(() => { setLoading(false); }, []);
  const FORMS = ["Tablet", "Syrup", "Injection", "Capsule", "Other"];
  const emptyRow = { name: "", category: "Tablet", cartons: "", boxesPerCarton: "", unitsPerBox: "" };
  const [rows, setRows] = useState<any[]>([{ ...emptyRow }]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<any>({ visible: false });

  const setRow = (i: number, key: string, val: string) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));

  const addRow = () => setRows((prev) => [...prev, { ...emptyRow }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    const items = rows
      .filter((r) => r.name.trim())
      .map((r) => {
        const cartons = Number(r.cartons) || 0;
        const boxesPerCarton = Number(r.boxesPerCarton) || 0;
        const unitsPerBox = Number(r.unitsPerBox) || 0;
        const total = cartons * (boxesPerCarton || 1) * (unitsPerBox || 1);
        const quantity = cartons
          ? `${cartons} carton(s)${boxesPerCarton ? ` × ${boxesPerCarton} box` : ""}${unitsPerBox ? ` × ${unitsPerBox}/box` : ""}${total ? ` = ${total} units` : ""}`
          : "";
        return { name: r.name.trim(), category: r.category, cartons, boxesPerCarton, unitsPerBox, quantity };
      });
    if (!items.length && !note.trim()) {
      setAlert({ visible: true, variant: "error", title: "Nothing to send", message: "Add at least one medicine or a note." });
      return;
    }
    setBusy(true);
    try {
      const res = await pharmacyService.createRequisition(items, note.trim());
      setAlert({ visible: true, variant: "success", title: "Requisition Sent", message: res?.message || "Your requisition has been sent to the admin.", onClose: () => navigation.goBack() });
    } catch (e: any) {
      setAlert({ visible: true, variant: "error", title: "Failed", message: e?.message || "Could not send requisition." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GradientHeader title="Medicine Requisition" subtitle="Request restock from admin" />

      {loading ? <SkeletonList count={6} dark={theme.dark} /> : <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.label, { color: theme.colors.text }]}>Medicines needed</Text>

        {rows.map((r, i) => (
          <View key={i} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="Medicine name"
                placeholderTextColor={theme.colors.textSecondary}
                value={r.name}
                onChangeText={(t) => setRow(i, "name", t)}
              />
              {rows.length > 1 && (
                <TouchableOpacity onPress={() => removeRow(i)} style={styles.removeBtn}>
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>

            {/* Form / category */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {FORMS.map((f) => {
                const active = r.category === f;
                return (
                  <TouchableOpacity
                    key={f}
                    activeOpacity={0.8}
                    onPress={() => setRow(i, "category", f)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1.5,
                      backgroundColor: active ? theme.colors.primary : "transparent",
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "#FFFFFF" : theme.colors.textSecondary }}>{f}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Packaging: cartons × boxes/carton × tablets/box */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              {[
                { key: "cartons", ph: "Cartons" },
                { key: "boxesPerCarton", ph: "Box/carton" },
                { key: "unitsPerBox", ph: r.category === "Tablet" || r.category === "Capsule" ? "Tabs/box" : "Units/box" },
              ].map((f) => (
                <TextInput
                  key={f.key}
                  style={[styles.input, { flex: 1, backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                  placeholder={f.ph}
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="number-pad"
                  value={r[f.key]}
                  onChangeText={(t) => setRow(i, f.key, t.replace(/[^0-9]/g, ""))}
                />
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity onPress={addRow} style={styles.addRow}>
          <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.addRowText, { color: theme.colors.primary }]}>Add another</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { color: theme.colors.text, marginTop: 18 }]}>Note (optional)</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: theme.colors.card, color: theme.colors.text, borderColor: theme.colors.border }]}
          placeholder="Any details for the admin…"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          value={note}
          onChangeText={setNote}
        />

        <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send to Admin</Text>}
        </TouchableOpacity>
      </ScrollView>}

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
  label: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  card: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 12 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1 },
  removeBtn: { padding: 2 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  addRowText: { fontWeight: "700", fontSize: 14 },
  textArea: { borderRadius: 12, padding: 14, minHeight: 100, textAlignVertical: "top", fontSize: 15, borderWidth: 1 },
  button: { marginTop: 26, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
