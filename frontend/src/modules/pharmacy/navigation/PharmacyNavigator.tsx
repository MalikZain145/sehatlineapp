import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { PharmacyProvider } from "../context/PharmacyContext";
import { ProfileProvider } from "../context/profileContext";

import DashboardScreen from "../screens/DashboardScreen";
import QueueScreen from "../screens/QueueScreen";
import SettingsScreen from "../screens/SettingsScreen";
import InventoryScreen from "../screens/InventoryScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import PrescriptionDetailsScreen from "../screens/PrescriptionDetailsScreen";
import { ThemeProvider } from "../Theme/themeContext";
import { PharmAlertHost } from "../components/common/PharmAlert";
import ProfileScreen from "../screens/ProfileScreen";
import BackupScreen from "../screens/BackupScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import MedicineDetailsScreen from "../screens/MedicineDetailsScreen";
import AddMedicineScreen from "../screens/AddMedicineScreen";
import EditMedicineScreen from "../screens/EditMedicineScreen";
import HelpSupportScreen from "../screens/HelpSupportScreen";
import AppearanceScreen from "../screens/AppearanceScreen";
import ReportProblemScreen from "../screens/ReportProblemScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import AboutAppScreen from "../screens/AboutAppScreen";
import TermsConditionsScreen from "../screens/Terms & ConditionsScreen";
import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen";
import RequisitionScreen from "../screens/RequisitionScreen";
import ReportAdminScreen from "../screens/ReportAdminScreen";
import CompletedOrdersScreen from "../screens/CompletedOrdersScreen";



const Stack = createNativeStackNavigator();

export default function PharmacyNavigator() {


  return (
      <ThemeProvider>
    <PharmacyProvider>
    <ProfileProvider>
        <Stack.Navigator screenOptions={{ headerShown: false }}>

          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
          />

          <Stack.Screen
            name="Queue"
            component={QueueScreen}
          />

          <Stack.Screen
            name="Inventory"
            component={InventoryScreen}
          />
          <Stack.Screen
  name="Appearance"
  component={AppearanceScreen}
/>
          
          <Stack.Screen
  name="MedicineDetails"
  component={MedicineDetailsScreen}
/>
<Stack.Screen
  name="AddMedicine"
  component={AddMedicineScreen}
/>
<Stack.Screen
  name="EditMedicine"
  component={EditMedicineScreen}
/>
  <Stack.Screen
            name="PrescriptionDetails"
            component={PrescriptionDetailsScreen}
          />

          <Stack.Screen
            name="Backup"
            component={BackupScreen}
          />
          <Stack.Screen
  name="EditProfile"
  component={EditProfileScreen}
/>

          <Stack.Screen
  name="Settings"
  component={SettingsScreen}
/>

          <Stack.Screen
            name="Analytics"
            component={AnalyticsScreen}
          />

          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
          />
<Stack.Screen
  name="TermsConditions"
  component={TermsConditionsScreen}
/>

          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
          />
          <Stack.Screen
  name="HelpSupport"
  component={HelpSupportScreen}
/>

<Stack.Screen
  name="ReportProblem"
  component={ReportProblemScreen}
/>
<Stack.Screen
  name="PrivacyPolicy"
  component={PrivacyPolicyScreen}
/>
<Stack.Screen
  name="Requisition"
  component={RequisitionScreen}
/>

<Stack.Screen
  name="CompletedOrders"
  component={CompletedOrdersScreen}
/>

<Stack.Screen
  name="ChangePassword"
  component={ChangePasswordScreen}
/>

<Stack.Screen
  name="AboutApp"
  component={AboutAppScreen}
/>

<Stack.Screen
  name="ReportAdmin"
  component={ReportAdminScreen}
/>

        </Stack.Navigator>
        {/* App-styled, theme-aware alert host (replaces native Alert.alert) */}
        <PharmAlertHost />
    </ProfileProvider>
    </PharmacyProvider>
    </ThemeProvider>
  );
}