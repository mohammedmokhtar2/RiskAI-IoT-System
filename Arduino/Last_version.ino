/**
 * Risk AI - Hardware Node (ESP32)
 * Path B: Scientific Math Implementation
 * Based on Formulas from Project Documentation (Page 29)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>
#include <ArduinoJson.h>

// --- PIN MAPPING (ESP32) ---
#define DHTPIN 4       // Connect DHT Data to D4 (GPIO 4)
#define DHTTYPE DHT11
#define MQPIN 34       // Connect MQ Analog to D34 (GPIO 34) - ADC1

// --- MATH CONSTANTS FROM PDF (Page 27) ---
#define R2 1000.0      // Reference Resistor (1k Ohm) 
float R0 = 1484.0;      // Calibration Constant (Resistance in fresh air) 

// --- NETWORK CONFIG ---
const char* ssid = "RiskAI_Hotspot"; 
const char* password = "12345678";

// --- OBJECTS ---
DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n--- Risk AI System (ESP32 Path B) Starting ---");

  // 1. Initialize Sensors
  dht.begin();
  pinMode(MQPIN, INPUT);

  // 2. Configure WiFi Hotspot
  Serial.print("Setting up Access Point...");
  IPAddress local_IP(192,168,10,1);
  IPAddress gateway(192,168,10,1);
  IPAddress subnet(255,255,255,0);
  
  WiFi.softAPConfig(local_IP, gateway, subnet);
  WiFi.softAP(ssid, password);
  
  Serial.println("Ready!");
  Serial.print("IP Address: "); Serial.println(WiFi.softAPIP());

  // 3. Define Routes
  server.on("/data", handleData);
  server.on("/health", [](){ server.send(200, "text/plain", "alive"); });
  server.onNotFound([](){ server.send(404, "text/plain", "Not Found"); });

  server.begin();
  Serial.println("HTTP Server started.");
}

void loop() {
  server.handleClient();
}

void handleData() {
  // --- 1. Read Raw Sensors ---
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int rawGas = analogRead(MQPIN); // Range: 0 - 4095

  // --- 2. Calculate Acetone (Math from PDF Page 29) ---
  
  // Step A: Convert Analog Reading to Voltage
  // ESP32 is 3.3V system with 12-bit ADC (4095)
  float volts = rawGas * (3.3 / 4095.0);

  // Prevent division by zero
  if (volts <= 0) volts = 0.001; 

  // Step B: Calculate Sensor Resistance (Rs) [cite: 578]
  // Formula: Rs = R2 * (1 - volts) / volts
  // Note: PDF assumes 5V logic, but we adapted for 3.3V ESP32
  float Rs = R2 * (3.3 - volts) / volts;

  // Step C: Calculate Acetone Concentration [cite: 581]
  // Formula: 159.6 - 133.33 * (Rs / R0)
  float acetone = 159.6 - (133.33 * (Rs / R0));

  // Step D: Sanity Check (PPM cannot be negative)
  if (acetone < 0) acetone = 0.0;
  
  // --- 3. Calculate CO2 (Simple Estimation) ---
  // The PDF focuses on Acetone math. For CO2, we map the raw value.
  float co2 = rawGas / 4.0; 

  // --- 4. Prepare JSON ---
  StaticJsonDocument<200> doc;
  
  // Handle DHT Errors
  if (isnan(temp) || isnan(hum)) {
    doc["temperature"] = 0;
    doc["humidity"] = 0;
    Serial.println("DHT Read Failed!");
  } else {
    doc["temperature"] = temp;
    doc["humidity"] = hum;
  }

  doc["co2"] = round(co2 * 100) / 100.0;     // Round to 2 decimals
  doc["aceton"] = round(acetone * 100) / 100.0;

  String jsonResponse;
  serializeJson(doc, jsonResponse);

  // --- 5. Send Response ---
  server.send(200, "application/json", jsonResponse);
  
  // Debug Output
  Serial.print("Raw: "); Serial.print(rawGas);
  Serial.print(" | Volts: "); Serial.print(volts);
  Serial.print(" | Rs: "); Serial.print(Rs);
  Serial.print(" | Acetone: "); Serial.println(acetone);
}