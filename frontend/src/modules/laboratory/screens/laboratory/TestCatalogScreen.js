import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../Theme/themeContext";
import laboratoryService from "../../services/laboratoryService";
import BottomSheet from "../../../../components/ui/BottomSheet";
import GradientHeader from "../../components/common/GradientHeader";
import { labAlert } from "../../components/common/LabAlert";
import { topPad } from '../../../../utils/safeArea';
import { BOTTOM_SPACE } from '../../../../utils/bottomInset';

const CATEGORIES = [
  "All",
  "Hematology",
  "Biochemistry",
  "Clinical Pathology",
  "Endocrinology",
  "Immunology",
];

// Map a backend test to the shape this screen renders.
function toRow(t) {
  return {
    id: t.id,
    name: t.name,
    code: t.code || "",
    category: t.category || "General",
    sampleType: t.sampleType || "Blood",
    processingTime: t.turnaroundHours ? `${t.turnaroundHours} hr` : "—",
    price: t.price || 0,
    available: t.active !== false,
  };
}

export default function TestCatalogScreen({
  navigation,
}) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState("All");
const [tests, setTests] = useState([]);

  const loadTests = useCallback(async () => {
    try { const res = await laboratoryService.listTests(); setTests((res?.tests || []).map(toRow)); }
    catch (e) { /* offline */ }
  }, []);

  useFocusEffect(useCallback(() => { loadTests(); }, [loadTests]));

  // ── Add / Edit form ──
  const FORM_CATEGORIES = ["Hematology", "Biochemistry", "Clinical Pathology", "Endocrinology", "Immunology", "Microbiology"];
  const SAMPLE_TYPES = ["Blood", "Urine", "Stool", "Swab", "Other"];
  const emptyForm = { name: "", category: "Hematology", sampleType: "Blood", price: "", turnaroundHours: "" };
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (t) => {
    setEditing(t.id);
    setForm({ name: t.name, category: t.category, sampleType: t.sampleType, price: String(t.price || ""), turnaroundHours: String(parseInt(t.processingTime, 10) || "") });
    setShowForm(true);
  };
  const saveTest = async () => {
    if (!form.name.trim()) { labAlert("Required", "Please enter a test name."); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), category: form.category, sampleType: form.sampleType,
        price: Number(form.price) || 0, turnaroundHours: Number(form.turnaroundHours) || 24,
      };
      if (editing) await laboratoryService.updateTest(editing, payload);
      else await laboratoryService.addTest(payload);
      setShowForm(false);
      await loadTests();
    } catch (e) { labAlert("Error", e?.message || "Could not save the test."); }
    finally { setSaving(false); }
  };
  const filteredTests = useMemo(() => {
    const query = search.trim().toLowerCase();

   return tests.filter((test) => {
      const matchesCategory =
        selectedCategory === "All" ||
        test.category === selectedCategory;

      const matchesSearch =
        !query ||
        test.name.toLowerCase().includes(query) ||
        test.code.toLowerCase().includes(query) ||
        test.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
 }, [search, selectedCategory, tests]);

 const toggleTestAvailability = (id) => {
  const cur = tests.find((t) => t.id === id);
  const next = !(cur?.available);
  setTests((currentTests) =>
    currentTests.map((test) =>
      test.id === id ? { ...test, available: next } : test
    )
  );
  laboratoryService.updateTest(id, { active: next }).catch(() => loadTests());
};


const deleteTest = (test) => {
  labAlert(
    "Delete Test",
    `Are you sure you want to delete "${test.name}"?`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setTests((currentTests) =>
            currentTests.filter(
              (item) => item.id !== test.id
            )
          );
          try { await laboratoryService.deleteTest(test.id); } catch (e) { loadTests(); }
        },
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
      {/* HEADER */}

      <GradientHeader title="Test Catalog" subtitle="Laboratory tests and information" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* SEARCH */}

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
            size={19}
            color={colors.textSecondary}
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search tests..."
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

          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* CATEGORIES */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.categoryContainer
          }
        >
          {CATEGORIES.map((category) => {
            const active =
              selectedCategory === category;

            return (
              <TouchableOpacity
                key={category}
                activeOpacity={0.8}
                onPress={() =>
                  setSelectedCategory(category)
                }
                style={[
                  styles.categoryButton,
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
                  style={{
                    color: active
                      ? colors.white
                      : colors.textSecondary,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* RESULT COUNT */}

        <View style={styles.resultHeader}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.text,
              },
            ]}
          >
            Available Tests
          </Text>

          <Text
            style={[
              styles.resultCount,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            {filteredTests.length} tests
          </Text>
        </View>

        {/* TEST LIST */}

        {/* TEST LIST */}

{filteredTests.map((test) => (
  <View
    key={test.id}
    style={[
      styles.testCard,
      {
        backgroundColor: colors.surface,
        borderColor: test.available
          ? colors.border
          : colors.error + "55",
        opacity: test.available ? 1 : 0.75,
      },
    ]}
  >
    {/* TEST ICON */}

    <View
      style={[
        styles.testIcon,
        {
          backgroundColor: colors.mint,
        },
      ]}
    >
      <Ionicons
        name="flask-outline"
        size={25}
        color={colors.primary}
      />
    </View>

    {/* TEST INFORMATION */}

    <View style={styles.testInfo}>
      <Text
        style={[
          styles.testName,
          {
            color: colors.text,
          },
        ]}
        numberOfLines={1}
      >
        {test.name}
      </Text>

      <Text
        style={[
          styles.testCode,
          {
            color: colors.textSecondary,
          },
        ]}
      >
        {test.id}
      </Text>

      {/* META */}

      <View style={styles.testMeta}>
        <View style={styles.metaItem}>
          <Ionicons
            name="grid-outline"
            size={13}
            color={colors.textSecondary}
          />

          <Text
            style={[
              styles.metaText,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            {test.category}
          </Text>
        </View>

        <View style={styles.metaItem}>
          <Ionicons
            name="time-outline"
            size={13}
            color={colors.textSecondary}
          />

          <Text
            style={[
              styles.metaText,
              {
                color: colors.textSecondary,
              },
            ]}
          >
            {test.processingTime}
          </Text>
        </View>
      </View>

      {/* PRICE */}

      <View style={styles.priceRow}>
        <Ionicons
          name="cash-outline"
          size={14}
          color={colors.primary}
        />

        <Text
          style={[
            styles.priceText,
            {
              color: colors.primary,
            },
          ]}
        >
          Rs. {test.price}
        </Text>
      </View>
    </View>

    {/* RIGHT SIDE */}

    <View style={styles.testActions}>

      {/* AVAILABILITY */}

      <View style={styles.availabilityRow}>
        <Text
          style={[
            styles.availabilityText,
            {
              color: test.available
                ? colors.success
                : colors.error,
            },
          ]}
        >
          {test.available
            ? "Available"
            : "Unavailable"}
        </Text>

        <Switch
          value={test.available}
          onValueChange={() =>
            toggleTestAvailability(test.id)
          }
          trackColor={{
            false: colors.border,
            true: colors.mint,
          }}
          thumbColor={
            test.available
              ? colors.primary
              : colors.textSecondary
          }
        />
      </View>

      {/* EDIT + DELETE */}

      <View style={styles.actionButtons}>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => openEdit(test)}
          style={[
            styles.actionButton,
            {
              backgroundColor:
                colors.mint,
            },
          ]}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={colors.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => deleteTest(test)}
          style={[
            styles.actionButton,
            {
              backgroundColor:
                colors.error + "15",
            },
          ]}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color={colors.error}
          />
        </TouchableOpacity>

      </View>
    </View>
  </View>
))}

        {/* EMPTY STATE */}

        {filteredTests.length === 0 && (
          <View
            style={[
              styles.emptyContainer,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="flask-outline"
              size={48}
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
              No Tests Found
            </Text>

            <Text
              style={[
                styles.emptyText,
                {
                  color: colors.textSecondary,
                },
              ]}
            >
              Try a different search or category.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add FAB */}
      <TouchableOpacity activeOpacity={0.85} onPress={openAdd} style={[styles.fab, { backgroundColor: colors.primary }]}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>

      {/* Add / Edit test sheet */}
      <BottomSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        overlayStyle={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
        sheetStyle={{ backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30, maxHeight: "90%" }}
      >
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={{ fontSize: 19, fontWeight: "900", color: colors.text, marginBottom: 4 }}>{editing ? "Edit Test" : "Add Test"}</Text>
          <Text style={{ fontSize: 12.5, color: colors.textSecondary, marginBottom: 14 }}>Tests you add here appear in the doctor's prescription list.</Text>

          <Text style={fstyles.label(colors)}>Test Name</Text>
          <TextInput style={fstyles.input(colors)} value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} placeholder="e.g. Complete Blood Count (CBC)" placeholderTextColor={colors.textSecondary} />

          <Text style={fstyles.label(colors)}>Category</Text>
          <View style={fstyles.chipsWrap}>
            {FORM_CATEGORIES.map((c) => {
              const active = form.category === c;
              return (
                <TouchableOpacity key={c} onPress={() => setForm((f) => ({ ...f, category: c }))} style={fstyles.chip(colors, active)}>
                  <Text style={fstyles.chipText(colors, active)}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={fstyles.label(colors)}>Sample Type</Text>
          <View style={fstyles.chipsWrap}>
            {SAMPLE_TYPES.map((c) => {
              const active = form.sampleType === c;
              return (
                <TouchableOpacity key={c} onPress={() => setForm((f) => ({ ...f, sampleType: c }))} style={fstyles.chip(colors, active)}>
                  <Text style={fstyles.chipText(colors, active)}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={fstyles.label(colors)}>Price (PKR)</Text>
              <TextInput style={fstyles.input(colors)} value={form.price} onChangeText={(t) => setForm((f) => ({ ...f, price: t.replace(/[^0-9]/g, "") }))} keyboardType="number-pad" placeholder="0" placeholderTextColor={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={fstyles.label(colors)}>Turnaround (hrs)</Text>
              <TextInput style={fstyles.input(colors)} value={form.turnaroundHours} onChangeText={(t) => setForm((f) => ({ ...f, turnaroundHours: t.replace(/[^0-9]/g, "") }))} keyboardType="number-pad" placeholder="24" placeholderTextColor={colors.textSecondary} />
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.85} onPress={saveTest} disabled={saving} style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 22 }}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={{ color: colors.white, fontSize: 15, fontWeight: "800" }}>{editing ? "Save Changes" : "Add Test"}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

// Small themed field helpers (functions → keep colors in scope).
const fstyles = {
  label: (c) => ({ fontSize: 12, color: c.textSecondary, fontWeight: "700", marginTop: 14, marginBottom: 6 }),
  input: (c) => ({ borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: c.text, backgroundColor: c.surface }),
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: (c, active) => ({ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1.5, backgroundColor: active ? c.primary : c.surface, borderColor: active ? c.primary : c.border }),
  chipText: (c, active) => ({ fontSize: 12, fontWeight: "700", color: active ? c.white : c.textSecondary }),
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: BOTTOM_SPACE
  },
  fab: {
    position: "absolute", right: 20, bottom: 26, width: 58, height: 58, borderRadius: 29,
    alignItems: "center", justifyContent: "center", elevation: 6,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
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

  headerTextContainer: {
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

  searchContainer: {
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
  },

  categoryContainer: {
    paddingVertical: 15,
    gap: 8,
  },

  categoryButton: {
    height: 36,
    paddingHorizontal: 15,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },

  resultCount: {
    fontSize: 11,
  },

  testCard: {
    borderRadius: 17,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  testIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  testInfo: {
    flex: 1,
    marginLeft: 12,
  },

  testName: {
    fontSize: 14,
    fontWeight: "800",
  },

  testCode: {
    fontSize: 10,
    marginTop: 3,
  },

  testMeta: {
    flexDirection: "row",
    marginTop: 8,
    gap: 12,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  metaText: {
    fontSize: 10,
  },
testActions: {
  alignItems: "flex-end",
  marginLeft: 8,
},

availabilityRow: {
  flexDirection: "row",
  alignItems: "center",
},

availabilityText: {
  fontSize: 9,
  fontWeight: "800",
  marginRight: 4,
},

actionButtons: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 7,
  gap: 7,
},

actionButton: {
  width: 34,
  height: 34,
  borderRadius: 17,
  alignItems: "center",
  justifyContent: "center",
},

priceRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 7,
  gap: 5,
},

priceText: {
  fontSize: 12,
  fontWeight: "800",
},

  emptyContainer: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 35,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },

  emptyText: {
    fontSize: 12,
    marginTop: 5,
    textAlign: "center",
  },
});