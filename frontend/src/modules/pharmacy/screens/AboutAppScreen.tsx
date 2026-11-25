import React from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";

import GradientHeader from "../components/common/GradientHeader";
import Colors from "../constants/colors";
import { useTheme } from "../Theme/themeContext";
import { APP_VERSION } from "../../../constants/version";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function AboutAppScreen() {
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
        title="About App"
        subtitle="Hospital Pharmacy Management System"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.logoContainer}>
          <View
  style={[
    styles.logoCircle,
    {
      borderColor: theme.colors.primary,
    },
  ]}
>
            <Image
  source={require("../assets/images/logoo.png")}
  style={{
    width: 70,
    height: 70,
    resizeMode: "contain",
  }}
/>
          </View>

         <Text
  style={[
    styles.appName,
    {
      color: theme.colors.text,
    },
  ]}
>
            Hospital Pharmacy Management System
          </Text>

         <Text
  style={[
    styles.version,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            Version {APP_VERSION}
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
>
            About
          </Text>

          <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>   Hospital Pharmacy Management System is designed
            to simplify medicine dispensing, patient queue
            management, prescription processing, inventory
            management and Loan Prescription (LP) generation
            for hospital pharmacists.
          </Text>
        </View>

        <View style={styles.card}>
          <Text
  style={[
    styles.heading,
    {
      color: theme.colors.text,
    },
  ]}
>
            Features
          </Text>

          <Text
  style={[
    styles.feature,
    {
      color: theme.colors.text,
    },
  ]}
>✔ Dashboard</Text>
         <Text
  style={[
    styles.feature,
    {
      color: theme.colors.text,
    },
  ]}
>✔ Today's Queue</Text>
          <Text
  style={[
    styles.feature,
    {
      color: theme.colors.text,
    },
  ]}
>✔ Prescription Management</Text>
          <Text
  style={[
    styles.feature,
    {
      color: theme.colors.text,
    },
  ]}
>✔ Inventory Management</Text>
          <Text
  style={[
    styles.feature,
    {
      color: theme.colors.text,
    },
  ]}
>✔ Notifications</Text>
          <Text
  style={[
    styles.feature,
    {
      color: theme.colors.text,
    },
  ]}
>✔ Loan Prescription (LP)</Text>
          <Text
  style={[
    styles.feature,
    {
      color: theme.colors.text,
    },
  ]}
>✔ Pharmacist Profile</Text>
          <Text
  style={[
    styles.feature,
    {
      color: theme.colors.text,
    },
  ]}
>✔ Settings</Text>
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
>
            Developed For
          </Text>

         <Text
  style={[
    styles.description,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            CDA Hospital Islamabad
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
          © 2026 Hospital Pharmacy Management System
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

  logoContainer: {
    alignItems: "center",
    marginBottom: 25,
  },

  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },

  logoText: {
    fontSize: 34,
    fontWeight: "800",
   
  },

  appName: {
    fontSize: 20,
    fontWeight: "700",
   
    textAlign: "center",
  },

  version: {
    marginTop: 5,
   
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

  feature: {
    fontSize: 15,
    marginBottom: 8,
    
  },

  footer: {
    textAlign: "center",
    marginTop: 20,
   
  },

});