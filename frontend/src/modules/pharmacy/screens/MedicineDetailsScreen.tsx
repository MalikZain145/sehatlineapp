import React from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../Theme/themeContext";
import GradientHeader from "../components/common/GradientHeader";
import Colors from "../constants/colors";
import { BOTTOM_SPACE } from '../../../utils/bottomInset';

export default function MedicineDetailsScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const route = useRoute<any>();

  const medicine = route.params?.medicine;

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
        title="Medicine Details"
        subtitle="View medicine information"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* Medicine Card */}

       <View
  style={[
    styles.topCard,
    {
      backgroundColor: theme.colors.card,
    },
  ]}
>

          <Ionicons
            name="medkit"
            size={60}
        color={theme.colors.primary}
          />

         <Text
  style={[
    styles.name,
    {
      color: theme.colors.text,
    },
  ]}
>
            {medicine?.name}
          </Text>

         <Text
  style={[
    styles.category,
    {
      color: theme.colors.textSecondary,
    },
  ]}
>
            {medicine?.category}
          </Text>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  medicine?.status === "In Stock"
                    ? "#DCFCE7"
                    : medicine?.status === "Low Stock"
                    ? "#FEF3C7"
                    : "#FEE2E2",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    medicine?.status === "In Stock"
                      ? "#22C55E"
                      : medicine?.status === "Low Stock"
                      ? "#F59E0B"
                      : "#EF4444",
                },
              ]}
            >
              {medicine?.status}
            </Text>
          </View>

        </View>

        {/* Details */}

        <View
  style={[
    styles.card,
    {
      backgroundColor: theme.colors.card,
    },
  ]}
>

          <DetailRow
            label="Medicine Name"
            value={medicine?.name}
          />

          <DetailRow
            label="Generic Name"
            value={medicine?.genericName || "—"}
          />

          <DetailRow
            label="Category"
            value={medicine?.category || "—"}
          />

          <DetailRow
            label="Strength / Power"
            value={medicine?.strength || "—"}
          />

          <DetailRow
            label="Manufacturer"
            value={medicine?.manufacturer || "—"}
          />

          <DetailRow
            label="Batch Number"
            value={medicine?.batchNumber || "—"}
          />

          <DetailRow
            label="Available Stock"
            value={`${medicine?.stock ?? 0} Units`}
          />

          <DetailRow
            label="Minimum Stock"
            value={`${medicine?.minimumStock ?? 0} Units`}
          />

          <DetailRow
            label="Expiry Date"
            value={medicine?.expiry || "—"}
          />

        </View>

        {/* Description — tap to edit */}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate("EditMedicine", { medicine })}
          style={[styles.card, { backgroundColor: theme.colors.card }]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Description</Text>
            <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
          </View>

          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            {medicine?.description?.trim()
              ? medicine.description
              : "No description added yet. Tap to add one."}
          </Text>
        </TouchableOpacity>

        {/* Edit Button */}

        <TouchableOpacity
         style={[
  styles.button,
  {
    backgroundColor: theme.colors.primary,
  },
]}
          onPress={() =>
            navigation.navigate("EditMedicine", { medicine })
          }
        >
          <Ionicons
            name="create-outline"
            size={22}
            color="#FFFFFF"
          />

          <Text style={styles.buttonText}>
            Edit Medicine
          </Text>

        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: theme.colors.textSecondary,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.value,
          {
            color: theme.colors.text,
          },
        ]}
      >
        {value}
      </Text>
    </View>
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

  topCard: {
   
    borderRadius: 22,
    alignItems: "center",
    padding: 24,
    elevation: 3,
    marginBottom: 20,
  },

  name: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: "800",
   
  },

  category: {
    marginTop: 6,
    fontSize: 15,
   
  },

  statusBadge: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
  },

  statusText: {
    fontWeight: "700",
  },

  card: {
   
    borderRadius: 18,
    padding: 20,
    elevation: 3,
    marginBottom: 20,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },

  label: {
  
    fontWeight: "600",
  },

  value: {
   
    fontWeight: "700",
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  description: {
    
    lineHeight: 24,
  },

  button: {
    
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  buttonText: {
   
    fontWeight: "700",
    fontSize: 17,
    marginLeft: 10,
  },

});