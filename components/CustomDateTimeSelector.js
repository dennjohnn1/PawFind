"use client"

import { useState } from "react"
import { View, TouchableOpacity, Modal, ScrollView } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import tw from "twrnc"
import CustomText from "./CustomText"

const formatDate = (date) => {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const formatTime = (date) => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function CustomDatePicker({ selectedDate, onDateChange }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate))

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const isFutureDate = (date) => {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    return date > today
  }

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const handleNextMonth = () => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    if (!isFutureDate(new Date(newMonth.getFullYear(), newMonth.getMonth(), 1))) {
      setCurrentMonth(newMonth)
    }
  }

  const handleDayPress = (day) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0)
    if (!isFutureDate(newDate)) {
      onDateChange(newDate)
    }
  }

  const daysInMonth = getDaysInMonth(currentMonth)
  const firstDay = getFirstDayOfMonth(currentMonth)
  const days = []

  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i)
  }

  const monthYear = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  return (
    <View style={tw`bg-white rounded-2xl p-4`}>
      <View style={tw`flex-row items-center justify-between mb-4`}>
        <TouchableOpacity onPress={handlePreviousMonth}>
          <Ionicons name="chevron-back" size={24} color="#F59549" />
        </TouchableOpacity>
        <CustomText weight="SemiBold" style={tw`text-lg`}>
          {monthYear}
        </CustomText>
        <TouchableOpacity
          onPress={handleNextMonth}
          disabled={isFutureDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={
              isFutureDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)) ? "#CCC" : "#F59549"
            }
          />
        </TouchableOpacity>
      </View>

      <View style={tw`flex-row mb-2`}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <View key={day} style={tw`flex-1 items-center py-2`}>
            <CustomText weight="SemiBold" style={tw`text-xs text-gray-500`}>
              {day}
            </CustomText>
          </View>
        ))}
      </View>

      <View style={tw`bg-gray-50 rounded-xl p-2`}>
        {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIndex) => (
          <View key={weekIndex} style={tw`flex-row`}>
            {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
              const dayDate = day ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day) : null
              const isDisabled = dayDate && isFutureDate(dayDate)
              const isSelected =
                day &&
                day === selectedDate.getDate() &&
                currentMonth.getMonth() === selectedDate.getMonth() &&
                currentMonth.getFullYear() === selectedDate.getFullYear()

              return (
                <TouchableOpacity
                  key={`${weekIndex}-${dayIndex}`}
                  onPress={() => day && handleDayPress(day)}
                  disabled={!day || isDisabled}
                  style={tw`flex-1 items-center py-3 ${isSelected ? "bg-orange-500 rounded-lg" : ""} ${isDisabled ? "opacity-30" : ""}`}
                >
                  {day && (
                    <CustomText weight="SemiBold" style={tw`${isSelected ? "text-white" : "text-gray-700"}`}>
                      {day}
                    </CustomText>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        ))}
      </View>
    </View>
  )
}

function CustomTimePicker({ selectedDate, onTimeChange }) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes = Array.from({ length: 60 }, (_, i) => i)
  const [isAM, setIsAM] = useState(selectedDate.getHours() < 12)

  const currentHour = selectedDate.getHours() % 12 || 12
  const currentMinute = selectedDate.getMinutes()

  const isFutureTime = (hour, minute) => {
    const today = new Date()
    const isToday =
      selectedDate.getDate() === today.getDate() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getFullYear() === today.getFullYear()

    if (!isToday) return false

    let hour24 = hour
    const isPM = selectedDate.getHours() >= 12
    if (hour !== 12 && isPM) hour24 = hour + 12
    if (hour === 12 && !isPM) hour24 = 0

    const selectedTime = new Date()
    selectedTime.setHours(hour24, minute, 0, 0)

    return selectedTime > today
  }

  const handleHourChange = (hour) => {
    const adjustedHour = isAM ? hour % 12 : (hour % 12) + 12
    if (!isFutureTime(hour, currentMinute)) {
      const newDate = new Date(selectedDate)
      newDate.setHours(adjustedHour, currentMinute, 0, 0)
      onTimeChange(newDate)
    }
  }

  const handleMinuteChange = (minute) => {
    if (!isFutureTime(currentHour, minute)) {
      const newDate = new Date(selectedDate)
      newDate.setHours(selectedDate.getHours(), minute, 0, 0)
      onTimeChange(newDate)
    }
  }

  const handleAMPMToggle = (ampm) => {
    const newDate = new Date(selectedDate)
    let newHour = selectedDate.getHours()
    
    if (ampm === "am" && !isAM) {
      newHour = newHour - 12
      setIsAM(true)
    } else if (ampm === "pm" && isAM) {
      newHour = newHour + 12
      setIsAM(false)
    }
    
    newDate.setHours(newHour, currentMinute, 0, 0)
    onTimeChange(newDate)
  }

  return (
    <View style={tw`bg-white rounded-2xl p-4`}>
      <CustomText weight="SemiBold" style={tw`text-center text-sm text-gray-600 mb-4`}>
        Set Time
      </CustomText>

      <View style={tw`flex-row items-center justify-center gap-4`}>
        <View style={tw`bg-gray-50 rounded-xl overflow-hidden`}>
          <CustomText weight="SemiBold" style={tw`text-xs text-gray-500 text-center pt-2`}>
            Hour
          </CustomText>
          <ScrollView style={tw`h-40 w-16`} showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
            {hours.map((hour) => (
              <TouchableOpacity
                key={hour}
                onPress={() => handleHourChange(hour)}
                style={tw`py-3 items-center ${hour === currentHour ? "bg-orange-500" : "bg-gray-50"}`}
              >
                <CustomText
                  weight="SemiBold"
                  style={tw`${hour === currentHour ? "text-white" : "text-gray-700"} text-lg`}
                >
                  {String(hour).padStart(2, "0")}
                </CustomText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <CustomText weight="Bold" style={tw`text-2xl text-gray-400`}>
          :
        </CustomText>

        <View style={tw`bg-gray-50 rounded-xl overflow-hidden`}>
          <CustomText weight="SemiBold" style={tw`text-xs text-gray-500 text-center pt-2`}>
            Minute
          </CustomText>
          <ScrollView style={tw`h-40 w-16`} showsVerticalScrollIndicator={false} scrollEventThrottle={16}>
            {minutes.map((minute) => (
              <TouchableOpacity
                key={minute}
                onPress={() => handleMinuteChange(minute)}
                style={tw`py-3 items-center ${minute === currentMinute ? "bg-orange-500" : "bg-gray-50"}`}
              >
                <CustomText
                  weight="SemiBold"
                  style={tw`${minute === currentMinute ? "text-white" : "text-gray-700"} text-lg`}
                >
                  {String(minute).padStart(2, "0")}
                </CustomText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={tw`gap-2`}>
          <TouchableOpacity
            onPress={() => handleAMPMToggle("am")}
            style={tw`px-3 py-2 rounded-lg ${isAM ? "bg-orange-500" : "bg-gray-200"}`}
          >
            <CustomText weight="SemiBold" style={tw`${isAM ? "text-white" : "text-gray-600"} text-sm`}>
              AM
            </CustomText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleAMPMToggle("pm")}
            style={tw`px-3 py-2 rounded-lg ${!isAM ? "bg-orange-500" : "bg-gray-200"}`}
          >
            <CustomText weight="SemiBold" style={tw`${!isAM ? "text-white" : "text-gray-600"} text-sm`}>
              PM
            </CustomText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export default function DateTimeSelector({ value, onChange, label }) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : new Date())

  const handleConfirm = () => {
    onChange(selectedDate.toISOString())
    setShowDatePicker(false)
    setShowTimePicker(false)
  }

  return (
    <View>
      <CustomText weight="SemiBold" style={tw`mb-2`}>
        {label}
      </CustomText>

      <View style={tw`bg-gray-50 rounded-xl border border-gray-200 mb-4`}>
        <View style={tw`flex-row items-center px-4 py-3`}>
          <View style={tw`flex-1`}>
            <CustomText style={tw`text-xs text-gray-500 mb-1`}>Date & Time</CustomText>
            <CustomText weight="SemiBold" style={tw`text-base text-gray-900`}>
              {formatDate(selectedDate)} at {formatTime(selectedDate)}
            </CustomText>
          </View>
          <Ionicons name="calendar-outline" size={24} color="#F59549" />
        </View>

        <View style={tw`flex-row border-t border-gray-200`}>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={tw`flex-1 flex-row items-center justify-center py-3 border-r border-gray-200`}
          >
            <Ionicons name="calendar" size={18} color="#666" />
            <CustomText style={tw`text-sm text-gray-600 ml-2`}>Edit Date</CustomText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowTimePicker(true)}
            style={tw`flex-1 flex-row items-center justify-center py-3`}
          >
            <Ionicons name="time" size={18} color="#666" />
            <CustomText style={tw`text-sm text-gray-600 ml-2`}>Edit Time</CustomText>
          </TouchableOpacity>
        </View>
      </View>

      {showDatePicker && (
        <Modal transparent animationType="slide">
          <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
            <View style={tw`bg-white rounded-t-3xl pt-4 pb-6`}>
              <View style={tw`flex-row items-center justify-between px-6 pb-4`}>
                <CustomText weight="Bold" style={tw`text-lg`}>
                  Select Date
                </CustomText>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <View style={tw`px-6 py-4`}>
                <CustomDatePicker selectedDate={selectedDate} onDateChange={setSelectedDate} />
              </View>

              <View style={tw`flex-row gap-3 px-6 pt-4`}>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(false)}
                  style={tw`flex-1 bg-gray-100 py-3 rounded-xl items-center`}
                >
                  <CustomText weight="SemiBold" style={tw`text-gray-700`}>
                    Cancel
                  </CustomText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirm}
                  style={tw`flex-1 bg-orange-500 py-3 rounded-xl items-center`}
                >
                  <CustomText weight="SemiBold" style={tw`text-white`}>
                    Confirm
                  </CustomText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showTimePicker && (
        <Modal transparent animationType="slide">
          <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
            <View style={tw`bg-white rounded-t-3xl pt-4 pb-6`}>
              <View style={tw`flex-row items-center justify-between px-6 pb-4`}>
                <CustomText weight="Bold" style={tw`text-lg`}>
                  Select Time
                </CustomText>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <View style={tw`px-6 py-4`}>
                <CustomTimePicker selectedDate={selectedDate} onTimeChange={setSelectedDate} />
              </View>

              <View style={tw`flex-row gap-3 px-6 pt-4`}>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(false)}
                  style={tw`flex-1 bg-gray-100 py-3 rounded-xl items-center`}
                >
                  <CustomText weight="SemiBold" style={tw`text-gray-700`}>
                    Cancel
                  </CustomText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirm}
                  style={tw`flex-1 bg-orange-500 py-3 rounded-xl items-center`}
                >
                  <CustomText weight="SemiBold" style={tw`text-white`}>
                    Confirm
                  </CustomText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}