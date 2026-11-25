import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";
import { useLaboratory } from "../../context/LaboratoryContext";
import { labAlert } from "../../components/common/LabAlert";
import { topPad } from '../../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../../utils/bottomInset';

export default function AddInventoryScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;
const { addInventoryItem } = useLaboratory();
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("");
  const [cartons, setCartons] = useState("");
  const [unitsPerCarton, setUnitsPerCarton] = useState("");
  const [unit, setUnit] = useState("");
  const [minimumStock, setMinimumStock] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  // Total stock = cartons × units per carton.
  const totalUnits = (Number(cartons) || 0) * (Number(unitsPerCarton) || 0);

  const handleAddInventory = () => {
    if (
      !itemName ||
      !category ||
      !cartons ||
      !unitsPerCarton ||
      !unit ||
      !minimumStock ||
      !expiryDate
    ) {
      labAlert(
        "Missing Information",
        "Please fill in all fields (including cartons and units per carton)."
      );
      return;
    }
addInventoryItem({
  name: itemName,
  category: category,
  cartons: Number(cartons),
  unitsPerCarton: Number(unitsPerCarton),
  quantity: totalUnits,
  unit: unit,
  minimumStock: Number(minimumStock),
  expiryDate: expiryDate,
});
    labAlert(
      "Inventory Added",
      `${itemName} has been added to inventory.`,
      [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      {/* ================= HEADER ================= */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={25}
            color={colors.text}
          />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
              },
            ]}
          >
            Add Inventory
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            Add a new laboratory item
          </Text>
        </View>
      </View>

      {/* ================= FORM ================= */}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* ITEM NAME */}

          <InputField
            label="Item Name"
            placeholder="e.g. Blood Collection Tubes"
            value={itemName}
            onChangeText={setItemName}
            icon="cube-outline"
            colors={colors}
          />

          {/* CATEGORY */}

          <InputField
            label="Category"
            placeholder="e.g. Sample Collection"
            value={category}
            onChangeText={setCategory}
            icon="folder-outline"
            colors={colors}
          />

          {/* CARTONS + UNITS PER CARTON */}

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <InputField
                label="Cartons"
                placeholder="e.g. 5"
                value={cartons}
                onChangeText={(t) => setCartons(t.replace(/[^0-9]/g, ""))}
                icon="cube-outline"
                keyboardType="numeric"
                colors={colors}
              />
            </View>

            <View style={styles.halfInput}>
              <InputField
                label="Units / carton"
                placeholder="e.g. 20"
                value={unitsPerCarton}
                onChangeText={(t) => setUnitsPerCarton(t.replace(/[^0-9]/g, ""))}
                icon="layers-outline"
                keyboardType="numeric"
                colors={colors}
              />
            </View>
          </View>

          {/* UNIT + computed total */}

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <InputField
                label="Unit name"
                placeholder="e.g. pieces"
                value={unit}
                onChangeText={setUnit}
                icon="pricetag-outline"
                colors={colors}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginBottom: 6, marginTop: 2 }}>Total units</Text>
              <View style={{ height: 52, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.mint, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.primary }}>{totalUnits || 0}</Text>
              </View>
            </View>
          </View>

          {/* MINIMUM STOCK */}

          <InputField
            label="Minimum Stock"
            placeholder="e.g. 20"
            value={minimumStock}
            onChangeText={setMinimumStock}
            icon="warning-outline"
            keyboardType="numeric"
            colors={colors}
          />

          {/* EXPIRY DATE */}

          <InputField
            label="Expiry Date"
            placeholder="e.g. Dec 2027"
            value={expiryDate}
            onChangeText={setExpiryDate}
            icon="calendar-outline"
            colors={colors}
          />

          {/* INFO */}

          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: colors.mint,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={21}
              color={colors.primary}
            />

            <Text
              style={[
                styles.infoText,
                {
                  color: colors.text,
                },
              ]}
            >
              Items will be marked as Low Stock when the
              quantity falls below the minimum stock level.
            </Text>
          </View>

          {/* ADD BUTTON */}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleAddInventory}
            style={[
              styles.addButton,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name="add-circle-outline"
              size={22}
              color="#FFFFFF"
            />

            <Text style={styles.addButtonText}>
              Add Inventory
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ================================================= */
/* INPUT FIELD */
/* ================================================= */

function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  keyboardType,
  colors,
}) {
  return (
    <View style={styles.inputWrapper}>
      <Text
        style={[
          styles.label,
          {
            color: colors.text,
          },
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={colors.primary}
        />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          keyboardType={keyboardType || "default"}
          style={[
            styles.input,
            {
              color: colors.text,
            },
          ]}
        />
      </View>
    </View>
  );
}

/* ================================================= */
/* STYLES */
/* ================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: BOTTOM_SPACE
  },

  header: {
    minHeight: topPad(105),
    paddingHorizontal: 18,
    paddingTop: topPad(45),
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    justifyContent: "center",
    alignItems: "center",
  },

  headerText: {
    marginLeft: 8,
    flex: 1,
  },

  title: {
    fontSize: 23,
    fontWeight: "800",
  },

  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },

  content: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },

  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },

  inputWrapper: {
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
  },

  inputContainer: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  input: {
    flex: 1,
    fontSize: 14,
    marginLeft: 9,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  halfInput: {
    width: "48%",
  },

  infoBox: {
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 2,
    marginBottom: 20,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 8,
  },

  addButton: {
    height: 52,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8,
  },
});