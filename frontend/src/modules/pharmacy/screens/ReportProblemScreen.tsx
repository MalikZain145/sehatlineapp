import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";

import GradientHeader from "../components/common/GradientHeader";
import Colors from "../constants/colors";
import { useTheme } from "../Theme/themeContext";
import { pharmAlert } from "../components/common/PharmAlert";
import pharmacyService from "../services/pharmacyService";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';
export default function ReportProblemScreen() {

  const [title, setTitle] = useState("");
  const { theme } = useTheme();
  const [description, setDescription] = useState("");

  // BUG FIX: used to show "submitted successfully" without sending anything.
  const submitReport = async () => {

    if (!title || !description) {
      pharmAlert(
        "Missing Information",
        "Please fill in all fields."
      );
      return;
    }

    try {
      const res: any = await pharmacyService.reportToAdmin(`${title}\n\n${description}`);
      pharmAlert(
        res?.queued ? "Saved Offline" : "Report Submitted",
        res?.queued
          ? "You're offline. Your report is saved and will be sent to the administrator automatically."
          : "Thank you! Your issue has been sent to the administrator."
      );
      setTitle("");
      setDescription("");
    } catch (e: any) {
      pharmAlert("Could Not Submit", e?.message || "Please try again.");
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
        title="Report a Problem"
        subtitle="Help us improve the application"
      />

      <ScrollView
        contentContainerStyle={styles.content}
      >

        <Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>
          Issue Title
        </Text>

        <TextInput
        
  style={[
    styles.input,
    {
      backgroundColor: theme.colors.card,
      color: theme.colors.text,
      borderColor: theme.colors.border,
    },
  ]}
  placeholderTextColor={theme.colors.textSecondary}
          placeholder="Enter issue title"
          value={title}
          onChangeText={setTitle}
        />
<Text
  style={[
    styles.label,
    {
      color: theme.colors.text,
    },
  ]}
>
          Description
        </Text>

        <TextInput
         
  style={[
    styles.textArea,
    {
      backgroundColor: theme.colors.card,
      color: theme.colors.text,
      borderColor: theme.colors.border,
    },
  ]}
  placeholderTextColor={theme.colors.textSecondary}
          placeholder="Describe the problem..."
          multiline
          numberOfLines={5}
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity
        
  style={[
    styles.button,
    {
      backgroundColor: theme.colors.primary,
    },
  ]}
          onPress={submitReport}
        >
          <Text
  style={[
    styles.buttonText,
    {
      color: theme.colors.white,
    },
  ]}
>
            Submit Report
          </Text>
        </TouchableOpacity>

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    paddingBottom: BOTTOM_SPACE
    
  },

  content: {
    padding: 20,
  },

  label: {
    fontSize: 16,
    fontWeight: "700",
   
    marginBottom: 8,
    marginTop: 16,
  },

  input: {
   
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    elevation: 2,
  },

  textArea: {
    
    borderRadius: 12,
    padding: 16,
    height: 140,
    textAlignVertical: "top",
    elevation: 2,
  },

  button: {
    marginTop: 30,
   
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },

  buttonText: {
    
    fontSize: 16,
    fontWeight: "700",
  },

});