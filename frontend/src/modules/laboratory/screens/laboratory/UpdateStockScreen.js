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

export default function UpdateStockScreen({ navigation, route }) {
  const { theme } = useTheme();
const colors = theme.colors;

const { updateInventoryStock } = useLaboratory();

  const item = route?.params?.item;

  const [quantity, setQuantity] = useState("");

  if (!item) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.background,
          },
        ]}
      >
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

          <Text
            style={[
              styles.title,
              {
                color: colors.text,
              },
            ]}
          >
            Update Stock
          </Text>
        </View>

        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={50}
            color={colors.error}
          />

          <Text
            style={[
              styles.errorTitle,
              {
                color: colors.text,
              },
            ]}
          >
            Inventory item not found
          </Text>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[
              styles.backHomeButton,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Text style={styles.buttonText}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentStock = Number(item.quantity);

  const addedStock =
    quantity === "" ? 0 : Number(quantity);

  const newStock = currentStock + addedStock;

  const handleUpdateStock = async () => {
    if (!quantity || Number(quantity) <= 0) {
      labAlert(
        "Invalid Quantity",
        "Please enter a quantity greater than 0."
      );
      return;
    }
    // BUG FIX: "Stock Updated" was shown even when the server call failed
    // (the update wasn't awaited).
    try {
      await updateInventoryStock(item.id, Number(quantity));
    } catch (e) {
      labAlert("Update Failed", e?.message || "Could not update the stock. Please try again.");
      return;
    }
    labAlert(
      "Stock Updated",
      `${item.name} stock has been updated from ${currentStock} ${item.unit} to ${newStock} ${item.unit}.`,
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
            Update Stock
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            Update laboratory inventory
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ================= ITEM CARD ================= */}

        <View
          style={[
            styles.itemCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.mint,
              },
            ]}
          >
            <Ionicons
              name="cube-outline"
              size={30}
              color={colors.primary}
            />
          </View>

          <View style={styles.itemInfo}>
            <Text
              style={[
                styles.itemName,
                {
                  color: colors.text,
                },
              ]}
            >
              {item.name}
            </Text>

            <Text
              style={[
                styles.category,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              {item.category}
            </Text>

            <Text
              style={[
                styles.itemId,
                {
                  color: colors.primary,
                },
              ]}
            >
              Item ID: {item.id}
            </Text>
          </View>
        </View>

        {/* ================= CURRENT STOCK ================= */}

        <View
          style={[
            styles.stockCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionLabel,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            Current Stock
          </Text>

          <Text
            style={[
              styles.currentStock,
              {
                color: colors.text,
              },
            ]}
          >
            {currentStock}{" "}
            <Text style={styles.unit}>
              {item.unit}
            </Text>
          </Text>
        </View>

        {/* ================= ADD STOCK ================= */}

        <View
          style={[
            styles.formCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.label,
              {
                color: colors.text,
              },
            ]}
          >
            Quantity to Add
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
              name="add-circle-outline"
              size={22}
              color={colors.primary}
            />

            <TextInput
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Enter quantity"
              placeholderTextColor={
                colors.textSecondary
              }
              keyboardType="numeric"
              style={[
                styles.input,
                {
                  color: colors.text,
                },
              ]}
            />

            <Text
              style={[
                styles.unitText,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              {item.unit}
            </Text>
          </View>

          {/* ================= NEW STOCK ================= */}

          <View
            style={[
              styles.newStockBox,
              {
                backgroundColor: colors.mint,
              },
            ]}
          >
            <View>
              <Text
                style={[
                  styles.newStockLabel,
                  {
                    color: colors.textSecondary,
                  },
                ]}
              >
                New Stock
              </Text>

              <Text
                style={[
                  styles.newStockValue,
                  {
                    color: colors.primary,
                  },
                ]}
              >
                {newStock} {item.unit}
              </Text>
            </View>

            <Ionicons
              name="trending-up-outline"
              size={30}
              color={colors.primary}
            />
          </View>

          {/* ================= BUTTON ================= */}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleUpdateStock}
            style={[
              styles.updateButton,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color="#FFFFFF"
            />

            <Text style={styles.updateButtonText}>
              Update Stock
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

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
    flex: 1,
    marginLeft: 8,
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

  itemCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  itemInfo: {
    flex: 1,
    marginLeft: 14,
  },

  itemName: {
    fontSize: 17,
    fontWeight: "800",
  },

  category: {
    fontSize: 12,
    marginTop: 5,
  },

  itemId: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 5,
  },

  stockCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
  },

  currentStock: {
    fontSize: 30,
    fontWeight: "800",
    marginTop: 5,
  },

  unit: {
    fontSize: 14,
    fontWeight: "600",
  },

  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
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
    fontSize: 15,
    marginLeft: 9,
  },

  unitText: {
    fontSize: 12,
    fontWeight: "600",
  },

  newStockBox: {
    minHeight: 75,
    borderRadius: 15,
    marginTop: 18,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  newStockLabel: {
    fontSize: 11,
  },

  newStockValue: {
    fontSize: 21,
    fontWeight: "800",
    marginTop: 3,
  },

  updateButton: {
    height: 52,
    borderRadius: 15,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  updateButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8,
  },

  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  errorTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 20,
  },

  backHomeButton: {
    paddingHorizontal: 25,
    paddingVertical: 13,
    borderRadius: 12,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});