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
import laboratoryService from "../../services/laboratoryService";
import GradientHeader from "../../components/common/GradientHeader";
import { labAlert } from "../../components/common/LabAlert";
import { topPad } from '../../../../utils/safeArea';

export default function ReportProblemScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const [problemType, setProblemType] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [description, setDescription] = useState("");
  const [sending, setSending] = useState(false);

  const problemTypes = [
    "Equipment Problem",
    "Stock / Inventory Problem",
    "System / App Problem",
    "Report Problem",
    "Patient / Queue Problem",
    "Other",
  ];

  const submitProblem = async () => {
    if (!problemType) {
      labAlert("Problem Type Required", "Please select the type of problem.");
      return;
    }
    if (!description.trim()) {
      labAlert("Description Required", "Please describe the problem.");
      return;
    }
    setSending(true);
    try {
      const message = `[${problemType} · ${priority}] ${description.trim()}`;
      await laboratoryService.reportToAdmin(message);
      labAlert(
        "Problem Reported",
        "Your problem has been successfully reported to the administrator.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      labAlert("Error", e?.message || "Could not send your report.");
    } finally { setSending(false); }
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}

        <GradientHeader title="Report a Problem" />

        {/* INTRODUCTION */}

        <View
          style={[
            styles.introCard,
            {
              backgroundColor: colors.mint,
            },
          ]}
        >
          <View
            style={[
              styles.introIcon,
              {
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Ionicons
              name="warning-outline"
              size={25}
              color={colors.primary}
            />
          </View>

          <View style={styles.introTextContainer}>
            <Text
              style={[
                styles.introTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              Having a problem?
            </Text>

            <Text
              style={[
                styles.introText,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Tell the laboratory administrator
              about an issue you're experiencing.
            </Text>
          </View>
        </View>

        {/* PROBLEM TYPE */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Problem Type
        </Text>

        <View style={styles.optionsContainer}>
          {problemTypes.map((type) => {
            const selected = problemType === type;

            return (
              <TouchableOpacity
                key={type}
                activeOpacity={0.8}
                onPress={() => setProblemType(type)}
                style={[
                  styles.typeButton,
                  {
                    backgroundColor: selected
                      ? colors.primary
                      : colors.surface,
                    borderColor: selected
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={
                    selected
                      ? "checkmark-circle"
                      : "ellipse-outline"
                  }
                  size={18}
                  color={
                    selected
                      ? colors.white
                      : colors.textSecondary
                  }
                />

                <Text
                  style={[
                    styles.typeText,
                    {
                      color: selected
                        ? colors.white
                        : colors.text,
                    },
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* PRIORITY */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Priority
        </Text>

        <View style={styles.priorityContainer}>
          {["Low", "Medium", "High", "Urgent"].map(
            (item) => {
              const selected = priority === item;

              return (
                <TouchableOpacity
                  key={item}
                  activeOpacity={0.8}
                  onPress={() => setPriority(item)}
                  style={[
                    styles.priorityButton,
                    {
                      backgroundColor: selected
                        ? colors.primary
                        : colors.surface,
                      borderColor: selected
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      {
                        color: selected
                          ? colors.white
                          : colors.text,
                      },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>

        {/* DESCRIPTION */}

        <Text
          style={[
            styles.sectionTitle,
            {
              color: colors.text,
            },
          ]}
        >
          Description
        </Text>

        <View
          style={[
            styles.inputCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the problem..."
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
            style={[
              styles.textInput,
              {
                color: colors.text,
              },
            ]}
          />

          <Text
            style={[
              styles.characterCount,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            {description.length}/500
          </Text>
        </View>

        {/* SUBMIT BUTTON */}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={submitProblem}
          style={[
            styles.submitButton,
            {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Ionicons
            name="paper-plane-outline"
            size={20}
            color={colors.white}
          />

          <Text
            style={[
              styles.submitText,
              {
                color: colors.white,
              },
            ]}
          >
            Submit Problem
          </Text>
        </TouchableOpacity>

        {/* NOTE */}

        <View
          style={[
            styles.noteBox,
            {
              backgroundColor: colors.mint,
            },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={19}
            color={colors.primary}
          />

          <Text
            style={[
              styles.noteText,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            Your report is sent to the hospital
            administrator, who will review it and
            follow up with you.
          </Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    paddingBottom: 40,
  },

  header: {
    height: topPad(105),
    paddingTop: topPad(45),
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  headerButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },

  headerSpacer: {
    width: 42,
  },

  introCard: {
    marginHorizontal: 18,
    marginTop: 20,
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  introTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  introTitle: {
    fontSize: 15,
    fontWeight: "800",
  },

  introText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 11,
  },

  optionsContainer: {
    marginHorizontal: 18,
  },

  typeButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 14,
    marginBottom: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  typeText: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 10,
  },

  priorityContainer: {
    marginHorizontal: 18,
    flexDirection: "row",
    gap: 8,
  },

  priorityButton: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  priorityText: {
    fontSize: 11,
    fontWeight: "800",
  },

  inputCard: {
    marginHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },

  textInput: {
    minHeight: 140,
    fontSize: 13,
    lineHeight: 20,
  },

  characterCount: {
    fontSize: 10,
    textAlign: "right",
    marginTop: 5,
  },

  submitButton: {
    height: 52,
    marginHorizontal: 18,
    marginTop: 22,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  submitText: {
    fontSize: 14,
    fontWeight: "800",
  },

  noteBox: {
    marginHorizontal: 18,
    marginTop: 16,
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },

  noteText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 16,
  },
});