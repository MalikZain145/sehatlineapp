import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import GradientHeader from "../components/common/GradientHeader";
import Colors from "../constants/colors";
import { useTheme } from "../Theme/themeContext";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';
export default function PrivacyPolicyScreen() {
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
        title="Privacy Policy"
        subtitle="Hospital Pharmacy Management System"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

       <View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
          <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>Patient Privacy</Text>

         <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            The Hospital Pharmacy Management System is committed to
            protecting patient confidentiality. Personal information,
            prescriptions and medical records are accessible only to
            authorized pharmacists and healthcare professionals.
          </Text>
        </View>

       <View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
          <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>Information We Collect</Text>
<Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            • Patient identification details{"\n"}
            • Prescription information{"\n"}
            • Medicine dispensing records{"\n"}
            • Pharmacist account information{"\n"}
            • Medicine inventory records{"\n"}
            • Loan Prescription (LP) records
          </Text>
        </View>

        <View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
          <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>Purpose of Data Collection</Text>

         <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            Information collected through this application is used only
            for hospital pharmacy operations including prescription
            verification, medicine dispensing, inventory management,
            patient queue management and Loan Prescription processing.
          </Text>
        </View>

        <View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
          <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>Data Security</Text>

          <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            We implement appropriate security measures to protect
            hospital records from unauthorized access, modification,
            disclosure or loss. Only authorized hospital personnel can
            access sensitive information.
          </Text>
        </View>

        <View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
  <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>User Responsibilities</Text>

         <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            • Keep login credentials confidential.{"\n"}
            • Log out after completing work.{"\n"}
            • Report suspicious activity immediately.{"\n"}
            • Follow hospital privacy regulations.
          </Text>
        </View>

      <View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
         <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>Data Retention</Text>

         <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            Hospital records are retained according to CDA Hospital
            policies and applicable healthcare regulations. Records are
            maintained only for authorized medical and administrative
            purposes.
          </Text>
        </View>
<View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
          <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>Policy Updates</Text>

        <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            This Privacy Policy may be updated periodically to reflect
            legal requirements, hospital policies and system
            improvements. Users are encouraged to review this page
            regularly.
          </Text>
        </View>

       <View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.surface,
    },
  ]}
>
         <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>Contact Information</Text>

         <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            CDA Hospital Islamabad{"\n\n"}
            Email: support@cdahospital.pk{"\n"}
            Phone: +92-51-9200000
          </Text>
        </View>

        <Text
  style={[
    styles.footer,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
          Hospital Pharmacy Management System{"\n"}
          Version 1.0.0{"\n\n"}
          © 2026 All Rights Reserved
        </Text>

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
    paddingBottom: 40,
  },

  card: {
  
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    elevation: 2,
  },

  heading: {
    fontSize: 18,
    fontWeight: "700",
   
    marginBottom: 10,
  },

  description: {
    fontSize: 15,
    lineHeight: 24,
    
  },

  footer: {
    textAlign: "center",
    marginTop: 20,
   
    fontSize: 14,
    lineHeight: 22,
  },

});