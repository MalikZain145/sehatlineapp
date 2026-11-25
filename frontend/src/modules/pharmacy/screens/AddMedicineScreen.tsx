import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "../Theme/themeContext";
import Colors from "../constants/colors";
import GradientHeader from "../components/common/GradientHeader";
import CategoryPicker from "../components/inventory/CategoryPicker";
import ExpiryPicker from "../components/inventory/ExpiryPicker";
import { useNavigation } from "@react-navigation/native";
import pharmacyService from "../services/pharmacyService";
import { pharmAlert } from "../components/common/PharmAlert";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';


export default function AddMedicineScreen() {

  const [medicineName, setMedicineName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [strength, setStrength] = useState("");
  const [category, setCategory] = useState("Tablet");
  const [department, setDepartment] = useState("Cardiology");
  const [stock, setStock] = useState("");
  const [minimumStock, setMinimumStock] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [description, setDescription] = useState("");

  const navigation = useNavigation<any>();

  const handleSave = async () => {
    if (!medicineName || !strength || !category || !stock) {
      pharmAlert("Missing Information", "Please fill medicine name, strength (mg), category and stock.");
      return;
    }
    try {
      await pharmacyService.addMedicine({
        name: medicineName,
        genericName,
        strength,
        category,
        department,
        stock: Number(stock) || 0,
        minimumStock: Number(minimumStock) || 10,
        expiry: expiryDate,
        batchNumber,
        manufacturer,
        description,
      });
      pharmAlert("Success", "Medicine added successfully.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      pharmAlert("Error", e?.message || "Could not add medicine.");
    }
  };
const { theme } = useTheme();
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
        title="Add Medicine"
        subtitle="Add a new medicine to inventory"
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
        <View style={styles.form}>

  <Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>Medicine Name *</Text>

  <TextInput
    placeholder="Enter medicine name"
    placeholderTextColor={theme.colors.textSecondary}
    value={medicineName}
    onChangeText={setMedicineName}
   style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
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
    placeholder="Enter generic name"
    placeholderTextColor={theme.colors.textSecondary}
    value={genericName}
    onChangeText={setGenericName}
   style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
  />

  <Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>Strength / Power (mg) *</Text>

  <TextInput
    placeholder="e.g. 500mg  •  250mg/5ml (syrup)"
    placeholderTextColor={theme.colors.textSecondary}
    value={strength}
    onChangeText={setStrength}
   style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
  />

 <CategoryPicker value={category} onChange={setCategory} />

  <CategoryPicker
    label="Department *"
    value={department}
    onChange={setDepartment}
    options={["Cardiology", "Diabetes", "Psychiatry", "Antibiotic", "Painkiller", "Gastro", "Respiratory", "Vitamin", "Endocrine", "General"]}
    placeholder="Which department (Cardiology, Diabetes…)"
  />

  <Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>Stock Quantity *</Text>

  <TextInput
    placeholder="Enter stock quantity"
    placeholderTextColor={theme.colors.textSecondary}
    keyboardType="numeric"
    value={stock}
    onChangeText={setStock}
    style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
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
    placeholder="Enter minimum stock"
    placeholderTextColor={theme.colors.textSecondary}
    keyboardType="numeric"
    value={minimumStock}
    onChangeText={setMinimumStock}
   style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
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
    placeholder="Enter batch number"
    placeholderTextColor={theme.colors.textSecondary}
    value={batchNumber}
    onChangeText={setBatchNumber}
   style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
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
    placeholder="Enter manufacturer"
    placeholderTextColor={theme.colors.textSecondary}
    value={manufacturer}
    onChangeText={setManufacturer}
   style={[
  styles.input,
  {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderColor: theme.colors.border,
  },
]}
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
    placeholder="What it's used for, dosage notes, storage…"
    placeholderTextColor={theme.colors.textSecondary}
    value={description}
    onChangeText={setDescription}
    multiline
    numberOfLines={4}
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
  />

</View>

<TouchableOpacity
 style={[
  styles.saveButton,
  {
    backgroundColor: theme.colors.primary,
  },
]}
  onPress={handleSave}
>
  <Text style={styles.saveButtonText}>
    Save Medicine
  </Text>
</TouchableOpacity>

<TouchableOpacity
  style={[
  styles.cancelButton,
  {
    borderColor: theme.colors.primary,
  },
]}
  onPress={() => navigation.goBack()}
>
  <Text
  style={[
    styles.cancelButtonText,
    {
      color: theme.colors.primary,
    },
  ]}
>
    Cancel
  </Text>
</TouchableOpacity>

      </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}
const styles = StyleSheet.create({

  container:{
    flex:1,
    paddingBottom: BOTTOM_SPACE
   
  },

  content:{
    paddingHorizontal:20,
    paddingTop:20,
    paddingBottom:40,
  },
  
  form: {
  marginTop: 5,
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

saveButton: {
  marginTop: 35,
  
  paddingVertical: 16,
  borderRadius: 18,
  alignItems: "center",
  elevation: 3,
},

saveButtonText: {

  fontSize: 17,
  fontWeight: "700",
},

cancelButton: {
  marginTop: 15,
  borderWidth: 1.5,
  
  paddingVertical: 16,
  borderRadius: 18,
  alignItems: "center",
  marginBottom: 40,
},

cancelButtonText: {
  fontSize: 17,
  fontWeight: "700",
},
});