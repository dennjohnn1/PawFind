import { useState, useRef, useEffect } from "react"
import {
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  Animated,
  Platform,
  InteractionManager,
} from "react-native"
import { MaterialIcons } from "@expo/vector-icons"
import CustomText from "./CustomText"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function DateOfBirthPicker({ value, onDateChange, error }) {
  const [modalVisible, setModalVisible] = useState(false)
  const [tempDate, setTempDate] = useState({
    month: value?.month ?? 1,
    day: value?.day ?? 1,
    year: value?.year ?? 2000,
  })

  const opacityAnim = useRef(new Animated.Value(0)).current
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 101 }, (_, i) => currentYear - i)

  const getDaysInMonth = (month, year) => new Date(year, month, 0).getDate()

  /** Clamp day when month/year changes */
  useEffect(() => {
    const maxDay = getDaysInMonth(tempDate.month, tempDate.year)
    if (tempDate.day > maxDay) {
      setTempDate((prev) => ({ ...prev, day: maxDay }))
    }
  }, [tempDate.month, tempDate.year])

  const days = Array.from(
    { length: getDaysInMonth(tempDate.month, tempDate.year) },
    (_, i) => i + 1
  )

  const formattedDate = value
    ? `${MONTH_NAMES[value.month - 1]} ${value.day}, ${value.year}`
    : "Select Date of Birth"

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: modalVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start()
  }, [modalVisible])

  const handleConfirm = () => {
    onDateChange(tempDate)
    setModalVisible(false)
  }

  /** ================= Picker Column ================= */
  const PickerColumn = ({
    data,
    selectedValue,
    onValueChange,
    renderLabel,
    flex = 1,
    visibleItems = 3, // default to 3 rows
  }) => {
    const itemHeight = 44
    const listRef = useRef(null)

    useEffect(() => {
      const index = data.indexOf(selectedValue)
      if (index >= 0) {
        InteractionManager.runAfterInteractions(() => {
          listRef.current?.scrollToOffset({
            offset: index * itemHeight,
            animated: false,
          })
        })
      }
    }, [modalVisible])

    const onMomentumScrollEnd = (e) => {
      const index = Math.round(e.nativeEvent.contentOffset.y / itemHeight)
      const item = data[index]
      if (item != null) onValueChange(item)
    }

    return (
      <View style={{ flex, height: itemHeight * visibleItems }}>
        <View style={{ flex: 1, overflow: "hidden" }}>
          {/* Highlighted selected row */}
          <View
            style={{
              position: "absolute",
              top: (itemHeight * visibleItems) / 2 - itemHeight / 2,
              height: itemHeight,
              width: "100%",
              backgroundColor: "#f9fafb",
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "#f3f4f6",
            }}
          />

          <FlatList
            ref={listRef}
            data={data}
            keyExtractor={(i) => i.toString()}
            showsVerticalScrollIndicator={false}
            snapToInterval={itemHeight}
            decelerationRate={Platform.OS === "ios" ? "normal" : 0.98}
            onMomentumScrollEnd={onMomentumScrollEnd}
            contentContainerStyle={{
              paddingVertical: itemHeight * Math.floor(visibleItems / 2),
            }}
            getItemLayout={(_, index) => ({
              length: itemHeight,
              offset: itemHeight * index,
              index,
            })}
            renderItem={({ item }) => {
              const isSelected = item === selectedValue
              return (
                <TouchableOpacity
                  onPress={() => onValueChange(item)}
                  style={{
                    height: itemHeight,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <CustomText
                    weight={isSelected ? "SemiBold" : "Regular"}
                    style={{
                      fontSize: isSelected ? 16 : 14,
                      color: isSelected ? "#000" : "#9ca3af",
                    }}
                  >
                    {renderLabel ? renderLabel(item) : item}
                  </CustomText>
                </TouchableOpacity>
              )
            }}
          />
        </View>
      </View>
    )
  }

  return (
    <View style={{ marginVertical: 10 }}>
      <TouchableOpacity
        onPress={() => {
          setTempDate(value ?? { month: 1, day: 1, year: 2000 })
          setModalVisible(true)
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1.5,
          borderColor: error ? "#ef4444" : "#e5e7eb",
          borderRadius: 14,
          padding: 16,
          backgroundColor: "#fff",
        }}
      >
        <MaterialIcons name="calendar-today" size={20} color="#9ca3af" />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <CustomText style={{ fontSize: 10, color: "#9ca3af" }}>
            Date of Birth
          </CustomText>
          <CustomText weight="Medium">{formattedDate}</CustomText>
        </View>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="none">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
        >
          <Animated.View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              opacity: opacityAnim,
              transform: [
                {
                  translateY: opacityAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
            }}
          >
            <View style={{ flexDirection: "row", marginBottom: 24 }}>
              <CustomText weight="Bold" style={{ fontSize: 18, flex: 1 }}>
                Select Date
              </CustomText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 32 }}>
              <PickerColumn
                data={MONTHS}
                selectedValue={tempDate.month}
                onValueChange={(v) => setTempDate((p) => ({ ...p, month: v }))}
                renderLabel={(v) => MONTH_NAMES[v - 1]}
                flex={2}
                visibleItems={3} // 3 rows
              />
              <PickerColumn
                data={days}
                selectedValue={tempDate.day}
                onValueChange={(v) => setTempDate((p) => ({ ...p, day: v }))}
                visibleItems={3} // 3 rows
              />
              <PickerColumn
                data={years}
                selectedValue={tempDate.year}
                onValueChange={(v) => setTempDate((p) => ({ ...p, year: v }))}
                visibleItems={3} // 3 rows
              />
            </View>

            <TouchableOpacity
              onPress={handleConfirm}
              style={{
                backgroundColor: "#F59549",
                paddingVertical: 18,
                borderRadius: 16,
                alignItems: "center",
              }}
            >
              <CustomText weight="Bold" style={{ color: "#fff" }}>
                Confirm Selection
              </CustomText>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  )
}
