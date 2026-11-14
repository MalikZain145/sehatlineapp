import React, { useState, useEffect, useCallback } from "react";
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
import laboratoryService from "../../services/laboratoryService";
import GradientHeader from "../../components/common/GradientHeader";
import { labAlert } from "../../components/common/LabAlert";
import { topPad } from '../../../../utils/safeArea';

function toRow(r) {
  const first = (r.items && r.items[0]) || {};
  return {
    id: r._id,
    itemName: first.name || "—",
    quantity: first.quantity || "",
    priority: r.note || "Normal",
    status: r.status === "fulfilled" ? "Received" : "Pending",
    date: r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "",
  };
}

export default function RequisitionsScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("Sample Collection");
  const [priority, setPriority] = useState("Normal");
  const [submitting, setSubmitting] = useState(false);

  const CATEGORIES = ["Sample Collection", "Kits", "Syringes", "Tubes", "Urine Bottles", "Stool Bottles", "Reagents", "Equipment"];

  const [requisitions, setRequisitions] = useState([]);

  const load = useCallback(async () => {
    try { const res = await laboratoryService.myRequisitions(); setRequisitions((res?.requisitions || []).map(toRow)); }
    catch (e) { /* offline */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitRequisition = async () => {
    if (!itemName.trim()) {
      labAlert("Item Required", "Please enter the item name.");
      return;
    }
    if (!quantity.trim()) {
      labAlert("Quantity Required", "Please enter the quantity.");
      return;
    }
    setSubmitting(true);
    try {
      await laboratoryService.createRequisition({ items: [{ name: itemName.trim(), category, quantity: String(quantity).trim() }], note: priority });
      setItemName("");
      setQuantity("");
      setCategory("Sample Collection");
      setPriority("Normal");
      await load();
      labAlert("Requisition Submitted", "Your stock request has been sent to Admin.");
    } catch (e) {
      labAlert("Error", e?.message || "Could not submit the requisition.");
    } finally { setSubmitting(false); }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return colors.success;

      case "Rejected":
        return colors.error;

      case "Received":
        return colors.blue;

      default:
        return colors.warning;
    }
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
      {/* HEADER */}

      <GradientHeader title="Requisitions" subtitle="Request laboratory stock from Admin" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* CREATE REQUISITION */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Create Requisition
        </Text>

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

          <Text
            style={[
              styles.label,
              {
                color: colors.text,
              },
            ]}
          >
            Item Name
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
              name="flask-outline"
              size={19}
              color={colors.primary}
            />

            <TextInput
              value={itemName}
              onChangeText={setItemName}
              placeholder="Enter item name"
              placeholderTextColor={
                colors.textSecondary
              }
              style={[
                styles.input,
                {
                  color: colors.text,
                },
              ]}
            />
          </View>

          {/* QUANTITY */}

          <Text
            style={[
              styles.label,
              {
                color: colors.text,
              },
            ]}
          >
            Quantity
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
              name="layers-outline"
              size={19}
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
          </View>

          {/* CATEGORY */}

          <Text style={[styles.label, { color: colors.text }]}>Category</Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <TouchableOpacity
                  key={c}
                  activeOpacity={0.8}
                  onPress={() => setCategory(c)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: active ? colors.white : colors.textSecondary }}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* PRIORITY */}

          <Text
            style={[
              styles.label,
              {
                color: colors.text,
              },
            ]}
          >
            Priority
          </Text>

          <View style={styles.priorityContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                setPriority("Normal")
              }
              style={[
                styles.priorityButton,
                {
                  borderColor:
                    priority === "Normal"
                      ? colors.primary
                      : colors.border,
                  backgroundColor:
                    priority === "Normal"
                      ? colors.mint
                      : colors.background,
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={17}
                color={
                  priority === "Normal"
                    ? colors.primary
                    : colors.textSecondary
                }
              />

              <Text
                style={{
                  color:
                    priority === "Normal"
                      ? colors.primary
                      : colors.textSecondary,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                Normal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                setPriority("Urgent")
              }
              style={[
                styles.priorityButton,
                {
                  borderColor:
                    priority === "Urgent"
                      ? colors.error
                      : colors.border,
                  backgroundColor:
                    priority === "Urgent"
                      ? colors.error + "15"
                      : colors.background,
                },
              ]}
            >
              <Ionicons
                name="alert-circle-outline"
                size={17}
                color={
                  priority === "Urgent"
                    ? colors.error
                    : colors.textSecondary
                }
              />

              <Text
                style={{
                  color:
                    priority === "Urgent"
                      ? colors.error
                      : colors.textSecondary,
                  fontWeight: "700",
                  fontSize: 13,
                }}
              >
                Urgent
              </Text>
            </TouchableOpacity>
          </View>

          {/* SUBMIT */}

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={submitRequisition}
            style={[
              styles.submitButton,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name="send-outline"
              size={19}
              color={colors.white}
            />

            <Text
              style={[
                styles.submitButtonText,
                {
                  color: colors.white,
                },
              ]}
            >
              Submit Requisition
            </Text>
          </TouchableOpacity>
        </View>

        {/* HISTORY */}

        <View style={styles.historyHeader}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
              },
            ]}
          >
            Requisition History
          </Text>

          <Text
            style={[
              styles.countText,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            {requisitions.length} requests
          </Text>
        </View>

        {requisitions.map((request) => {
          const statusColor =
            getStatusColor(request.status);

          return (
            <View
              key={request.id}
              style={[
                styles.requestCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.requestTop}>
                <View
                  style={[
                    styles.requestIcon,
                    {
                      backgroundColor:
                        colors.mint,
                    },
                  ]}
                >
                  <Ionicons
                    name="cube-outline"
                    size={22}
                    color={colors.primary}
                  />
                </View>

                <View
                  style={styles.requestInfo}
                >
                  <Text
                    style={[
                      styles.requestName,
                      {
                        color: colors.text,
                      },
                    ]}
                  >
                    {request.itemName}
                  </Text>

                  <Text
                    style={[
                      styles.requestId,
                      {
                        color:
                          colors.textSecondary,
                      },
                    ]}
                  >
                    {request.id}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        statusColor + "18",
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: statusColor,
                      fontSize: 10,
                      fontWeight: "800",
                    }}
                  >
                    {request.status}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.requestDetails,
                  {
                    borderTopColor:
                      colors.border,
                  },
                ]}
              >
                <View style={styles.detail}>
                  <Ionicons
                    name="layers-outline"
                    size={15}
                    color={
                      colors.textSecondary
                    }
                  />

                  <Text
                    style={[
                      styles.detailText,
                      {
                        color:
                          colors.textSecondary,
                      },
                    ]}
                  >
                    Qty: {request.quantity}
                  </Text>
                </View>

                <View style={styles.detail}>
                  <Ionicons
                    name={
                      request.priority ===
                      "Urgent"
                        ? "alert-circle-outline"
                        : "checkmark-circle-outline"
                    }
                    size={15}
                    color={
                      request.priority ===
                      "Urgent"
                        ? colors.error
                        : colors.primary
                    }
                  />

                  <Text
                    style={[
                      styles.detailText,
                      {
                        color:
                          request.priority ===
                          "Urgent"
                            ? colors.error
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {request.priority}
                  </Text>
                </View>

                <View style={styles.detail}>
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color={
                      colors.textSecondary
                    }
                  />

                  <Text
                    style={[
                      styles.detailText,
                      {
                        color:
                          colors.textSecondary,
                      },
                    ]}
                  >
                    {request.date}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    minHeight: topPad(105),
    paddingTop: topPad(42),
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  headerButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#FFFFFF",
    opacity: 0.8,
    fontSize: 11,
    marginTop: 3,
  },

  headerSpacer: {
    width: 42,
  },

  content: {
    padding: 18,
    paddingBottom: 35,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
  },

  formCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 25,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 5,
  },

  inputContainer: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  input: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
  },

  priorityContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },

  priorityButton: {
    flex: 1,
    height: 45,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  submitButton: {
    height: 50,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  submitButtonText: {
    fontSize: 13,
    fontWeight: "800",
  },

  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  countText: {
    fontSize: 12,
    marginBottom: 12,
  },

  requestCard: {
    borderRadius: 17,
    borderWidth: 1,
    padding: 15,
    marginBottom: 12,
  },

  requestTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  requestIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  requestInfo: {
    flex: 1,
    marginLeft: 11,
  },

  requestName: {
    fontSize: 14,
    fontWeight: "800",
  },

  requestId: {
    fontSize: 10,
    marginTop: 3,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },

  requestDetails: {
    borderTopWidth: 1,
    marginTop: 13,
    paddingTop: 11,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  detail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  detailText: {
    fontSize: 10,
    fontWeight: "600",
  },
});