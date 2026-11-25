import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../Theme/themeContext";
import Colors from "../constants/colors";
import GradientHeader from "../components/common/GradientHeader";
import CategoryPicker from "../components/inventory/CategoryPicker";
import ExpiryPicker from "../components/inventory/ExpiryPicker";
import pharmacyService from "../services/pharmacyService";
import { pharmAlert } from "../components/common/PharmAlert";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function EditMedicineScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const med = route.params?.medicine || {};
  const { theme } = useTheme();
  const [medicineName, setMedicineName] = useState(med.name || "");
  const [genericName, setGenericName] = useState(med.genericName || "");
  const [strength, setStrength] = useState(med.strength || "");
  const [category, setCategory] = useState(med.category || "Tablet");
  const [department, setDepartment] = useState(med.department || "General");
  const [stock, setStock] = useState(String(med.stock ?? ""));
  const [minimumStock, setMinimumStock] = useState(String(med.minimumStock ?? "10"));
  const [expiryDate, setExpiryDate] = useState(med.expiry || "");
  const [batchNumber, setBatchNumber] = useState(med.batchNumber || "");
  const [manufacturer, setManufacturer] = useState(med.manufacturer || "");
  const [description, setDescription] = useState(med.description || "");

  const handleUpdate = async () => {
    if (!med.id) { pharmAlert("Error", "Missing medicine id."); return; }
    try {
      await pharmacyService.updateMedicine(med.id, {
        name: medicineName, genericName, strength, category, department,
        stock: Number(stock) || 0, minimumStock: Number(minimumStock) || 10,
        expiry: expiryDate, batchNumber, manufacturer, description,
      });
      pharmAlert("Success", "Medicine updated successfully.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      pharmAlert("Error", e?.message || "Could not update medicine.");
    }
  };

  return (
    <SafeAreaView
  style={[
    styles.container,
    {
      backgroundColor: theme.colors.background,
    },
  ]}
>
      <GradientHeader
        title="Edit Medicine"
        subtitle="Update medicine information"
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
       <Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>Medicine Name</Text>

        <TextInput
        style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
          value={medicineName}
          onChangeText={setMedicineName}
        />

        <Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>Generic Name</Text>

        <TextInput
          style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
          value={genericName}
          onChangeText={setGenericName}
        />

        <Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>Strength / Power (mg)</Text>

        <TextInput
          style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
          value={strength}
          onChangeText={setStrength}
          placeholder="e.g. 500mg  •  250mg/5ml (syrup)"
          placeholderTextColor={theme.colors.textSecondary}
        />

        <CategoryPicker label="Category" value={category} onChange={setCategory} />

        <CategoryPicker
          label="Department"
          value={department}
          onChange={setDepartment}
          options={["Cardiology", "Diabetes", "Psychiatry", "Antibiotic", "Painkiller", "Gastro", "Respiratory", "Vitamin", "Endocrine", "General"]}
        />

        <Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>Stock Quantity</Text>

        <TextInput
         style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
          keyboardType="numeric"
          value={stock}
          onChangeText={setStock}
        />

        <Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>Minimum Stock</Text>

        <TextInput
        style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
          keyboardType="numeric"
          value={minimumStock}
          onChangeText={setMinimumStock}
        />

        <ExpiryPicker value={expiryDate} onChange={setExpiryDate} />

        <Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>Batch Number</Text>

        <TextInput
          style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
          value={batchNumber}
          onChangeText={setBatchNumber}
        />

        <Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>Manufacturer</Text>

        <TextInput
         style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
          value={manufacturer}
          onChangeText={setManufacturer}
        />

        <Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>Description</Text>

        <TextInput
          style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
    height: 110,
    textAlignVertical: "top",
    paddingTop: 14,
  },
]}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          placeholder="What it's used for, dosage notes, storage…"
          placeholderTextColor={theme.colors.textSecondary}
        />

        <TouchableOpacity
          style={[
  styles.updateButton,
  {
    backgroundColor: theme.colors.primary,
  },
]}
          onPress={handleUpdate}
        >
          <Text style={styles.updateButtonText}>
            Update Medicine
          </Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: BOTTOM_SPACE
   
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
   
    marginBottom: 8,
    marginTop: 18,
  },

  input: {
   
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 15,
    fontSize: 16,
    borderWidth: 1,
   
    elevation: 2,
  },

  updateButton: {
    marginTop: 35,
   
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },

  updateButtonText: {
  
    fontSize: 17,
    fontWeight: "700",
  },

  cancelButton: {
    marginTop: 15,
    borderWidth: 1.5,
   
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },

  cancelButtonText: {
   
    fontSize: 17,
    fontWeight: "700",
  },
});