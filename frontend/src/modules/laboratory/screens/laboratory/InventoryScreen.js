import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../Theme/themeContext";
import { useLaboratory } from "../../context/LaboratoryContext";
import { topPad } from '../../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../../utils/bottomInset';

export default function InventoryScreen({ navigation }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const { inventoryItems = [] } = useLaboratory();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  /* ================================================= */
  /* STATUS */
  /* ================================================= */

  const getStatus = (item) => {
    if (item.quantity <= 0) {
      return "Out of Stock";
    }

    if (item.quantity <= item.minimumStock) {
      return "Low Stock";
    }

    return "In Stock";
  };

  const getStatusColor = (status) => {
    if (status === "Out of Stock") {
      return colors.error;
    }

    if (status === "Low Stock") {
      return colors.warning;
    }

    return colors.success;
  };

  /* ================================================= */
  /* FILTER */
  /* ================================================= */

  const filteredInventory = inventoryItems.filter((item) => {
    const status = getStatus(item);

    const matchesSearch =
      item.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      item.category
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" || status === filter;

    return matchesSearch && matchesFilter;
  });

  /* ================================================= */
  /* INVENTORY CARD */
  /* ================================================= */

  const renderItem = ({ item }) => {
    const status = getStatus(item);
    const statusColor = getStatusColor(status);

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        {/* ICON */}

        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: colors.mint,
            },
          ]}
        >
          <Ionicons
            name="cube-outline"
            size={25}
            color={colors.primary}
          />
        </View>

        {/* INFO */}

        <View style={styles.info}>
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

          <View style={styles.stockRow}>
            <Text
              style={[
                styles.stockLabel,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Stock:
            </Text>

            <Text
              style={[
                styles.quantity,
                {
                  color: colors.text,
                },
              ]}
            >
              {item.quantity} {item.unit}
            </Text>
          </View>

          <Text
            style={[
              styles.minimum,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            Minimum: {item.minimumStock} {item.unit}
          </Text>

          <Text
            style={[
              styles.expiry,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            Expiry: {item.expiryDate}
          </Text>
        </View>

        {/* RIGHT */}

        <View style={styles.rightSection}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  statusColor + "20",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: statusColor,
                },
              ]}
            >
              {status}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate("UpdateStock", {
                item,
              })
            }
            style={[
              styles.updateButton,
              {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color="#FFFFFF"
            />

            <Text style={styles.updateButtonText}>
              Update
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
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
            Inventory
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            Laboratory supplies and stock
          </Text>
        </View>

        {/* ADD */}

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate("AddInventory")
          }
          style={[
            styles.addButton,
            {
              backgroundColor: colors.primary,
            },
          ]}
        >
          <Ionicons
            name="add"
            size={27}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      {/* ================================================= */}
      {/* SEARCH */}
      {/* ================================================= */}

      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={21}
          color={colors.textSecondary}
        />

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search inventory..."
          placeholderTextColor={
            colors.textSecondary
          }
          style={[
            styles.searchInput,
            {
              color: colors.text,
            },
          ]}
        />
      </View>

      {/* ================================================= */}
      {/* FILTERS */}
      {/* ================================================= */}

      <View style={styles.filterContainer}>
        {[
          "All",
          "In Stock",
          "Low Stock",
          "Out of Stock",
        ].map((item) => {
          const active = filter === item;

          return (
            <TouchableOpacity
              key={item}
              activeOpacity={0.8}
              onPress={() => setFilter(item)}
              style={[
                styles.filterButton,
                {
                  backgroundColor: active
                    ? colors.primary
                    : colors.surface,
                  borderColor: active
                    ? colors.primary
                    : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  {
                    color: active
                      ? "#FFFFFF"
                      : colors.text,
                  },
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ================================================= */}
      {/* LIST */}
      {/* ================================================= */}

      <FlatList
        data={filteredInventory}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="cube-outline"
              size={55}
              color={colors.textSecondary}
            />

            <Text
              style={[
                styles.emptyTitle,
                {
                  color: colors.text,
                },
              ]}
            >
              No inventory found
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Try another search or add a new
              inventory item.
            </Text>
          </View>
        }
      />
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

  addButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },

  searchContainer: {
    height: 50,
    marginHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 9,
  },

  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 18,
    marginBottom: 15,
    gap: 7,
  },

  filterButton: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },

  filterText: {
    fontSize: 11,
    fontWeight: "700",
  },

  list: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },

  card: {
    minHeight: 145,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 13,
    flexDirection: "row",
    elevation: 3,
  },

  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },

  info: {
    flex: 1,
    marginLeft: 12,
  },

  itemName: {
    fontSize: 14,
    fontWeight: "800",
  },

  category: {
    fontSize: 11,
    marginTop: 4,
  },

  itemId: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },

  stockRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  stockLabel: {
    fontSize: 11,
  },

  quantity: {
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 4,
  },

  minimum: {
    fontSize: 10,
    marginTop: 3,
  },

  expiry: {
    fontSize: 10,
    marginTop: 3,
  },

  rightSection: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginLeft: 5,
  },

  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 9,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },

  updateButton: {
    height: 34,
    paddingHorizontal: 9,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  updateButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 4,
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 70,
    paddingHorizontal: 30,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 12,
  },

  emptyText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 5,
    lineHeight: 18,
  },
});