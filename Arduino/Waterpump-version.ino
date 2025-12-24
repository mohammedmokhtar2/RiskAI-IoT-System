


// /**
//  * Risk AI - Hardware Node (ESP32)
//  * Refactored for Non-Blocking Multitasking
//  */

// #include <WiFi.h>
// #include <WebServer.h>
// #include <DHT.h>
// #include <ArduinoJson.h>
// #include <ESP32Servo.h>

// // --- PIN MAPPING (ESP32) ---
// #define DHTPIN 4       
// #define DHTTYPE DHT11
// #define MQPIN 34       
// #define RELAY_PIN 26   
// #define SERVO_PIN 27

// // --- GLOBAL VARIABLES ---
// // These hold the current state for both the Webpage AND the Actuators
// float acetone = 0.0;
// float temp = 0.0;
// float hum = 0.0;
// float co2 = 0.0; 

// // --- TIMING VARIABLES (Replaces Delay) ---
// unsigned long previousMillis = 0;
// const long interval = 2000; // Read sensors every 2 seconds

// // --- MATH CONSTANTS ---
// #define R2 1000.0      
// float R0 = 1484.0;      

// // --- NETWORK CONFIG ---
// const char* ssid = "RiskAI_Hotspot"; 
// const char* password = "12345678";

// // --- OBJECTS ---
// DHT dht(DHTPIN, DHTTYPE);
// WebServer server(80);
// Servo myServo;

// void setup() {
//   Serial.begin(115200);
//   delay(1000); // Initial startup delay is fine
//   Serial.println("\n--- Risk AI System (ESP32 Path B) Starting ---");

//   // 1. Initialize Sensors & Actuators
//   dht.begin();
//   pinMode(MQPIN, INPUT);
//   pinMode(RELAY_PIN, OUTPUT);
//   digitalWrite(RELAY_PIN, HIGH); // Start OFF (Assuming Active LOW Relay)
  
//   myServo.setPeriodHertz(50);
//   myServo.attach(SERVO_PIN, 500, 2400);
//   myServo.write(0); 

//   // 2. Configure WiFi
//   Serial.print("Setting up Access Point...");
//   IPAddress local_IP(192,168,10,1);
//   IPAddress gateway(192,168,10,1);
//   IPAddress subnet(255,255,255,0);
  
//   WiFi.softAPConfig(local_IP, gateway, subnet);
//   WiFi.softAP(ssid, password);
  
//   Serial.println("Ready!");
//   Serial.print("IP Address: "); Serial.println(WiFi.softAPIP());

//   // 3. Define Routes
//   server.on("/data", handleData); // Only SENDS data now
//   server.on("/health", [](){ server.send(200, "text/plain", "alive"); });
//   server.onNotFound([](){ server.send(404, "text/plain", "Not Found"); });

//   server.begin();
//   Serial.println("HTTP Server started.");
// }

// void loop() {
//   // 1. Always listen for web clients (Do not block this!)
//   server.handleClient();

//   // 2. Non-Blocking Timer to Read Sensors
//   unsigned long currentMillis = millis();
//   if (currentMillis - previousMillis >= interval) {
//     // Save the last time we read sensors
//     previousMillis = currentMillis;
    
//     // Read sensors and update GLOBAL variables
//     readSensors(); 
    
//     // Check thresholds immediately after reading
//     checkThresholds();
//   }
// }

// // --- LOGIC FUNCTIONS ---

// void readSensors() {
//   // Read DHT
//   float newTemp = dht.readTemperature();
//   float newHum = dht.readHumidity();

//   // Validate DHT reading before updating global
//   if (!isnan(newTemp) && !isnan(newHum)) {
//     temp = newTemp;
//     hum = newHum;
//   } else {
//     Serial.println("DHT Read Failed - Keeping old values");
//   }

//   // Read Gas Sensor
//   int rawGas = analogRead(MQPIN); 
  
//   // Calculate Acetone
//   float volts = rawGas * (3.3 / 4095.0);
//   if (volts <= 0) volts = 0.001; 
//   float Rs = R2 * (3.3 - volts) / volts;
//   float calculatedAcetone = 159.6 - (133.33 * (Rs / R0));
  
//   if (calculatedAcetone < 0) calculatedAcetone = 0.0;
  
//   // Update Global Gas Variables
//   acetone = calculatedAcetone;
//   co2 = rawGas / 4.0; // Simple estimation

//   // Debug Print
//   Serial.print("T: "); Serial.print(temp);
//   Serial.print(" | Acetone: "); Serial.println(acetone);
// }

// void checkThresholds() {
//   // Logic: Servo moves if Acetone is high
//   if(acetone > 100) {
//     myServo.write(90);
//   } else {
//     myServo.write(0);
//   }

//   // Logic: Pump turns on if Temp is high
//   // Assuming Active LOW relay (LOW = ON)
//   if(temp > 30) {
//     digitalWrite(RELAY_PIN, LOW); // ON
//   } else {
//     digitalWrite(RELAY_PIN, HIGH); // OFF
//   }
// }

// // --- WEB SERVER FUNCTION ---
// void handleData() {
//   // We do NOT read sensors here. We just send the latest Global values.
//   // This makes the web response extremely fast.
  
//   StaticJsonDocument<200> doc;
  
//   doc["temperature"] = temp;
//   doc["humidity"] = hum;
//   doc["co2"] = round(co2 * 100) / 100.0;
//   doc["aceton"] = round(acetone * 100) / 100.0;

//   String jsonResponse;
//   serializeJson(doc, jsonResponse);

//   server.send(200, "application/json", jsonResponse);
// }





/**
 * Risk AI - Hardware Node (ESP32)
 * Updated: Non-Blocking + Buzzer Alarm
 */

#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// --- PIN MAPPING (ESP32) ---
#define DHTPIN 4       
#define DHTTYPE DHT11
#define MQPIN 34       
#define RELAY_PIN 26   
#define SERVO_PIN 27
#define BUZZER_PIN 18  // <--- NEW: Buzzer Pin

// --- GLOBAL VARIABLES ---
float acetone = 0.0;
float temp = 0.0;
float hum = 0.0;
float co2 = 0.0; 

// --- TIMING VARIABLES ---
unsigned long previousMillis = 0;
const long interval = 2000; // Read sensors every 2 seconds

// --- MATH CONSTANTS ---
#define R2 1000.0      
float R0 = 1484.0;      

// --- NETWORK CONFIG ---
const char* ssid = "RiskAI_Hotspot"; 
const char* password = "12345678";

// --- OBJECTS ---
DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);
Servo myServo;

void setup() {
  Serial.begin(115200);
  delay(1000); 

  // 1. Initialize Hardware
  dht.begin();
  pinMode(MQPIN, INPUT);
  
  // Actuators
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // OFF (assuming active LOW)
  
  // Buzzer
  pinMode(BUZZER_PIN, OUTPUT);   // <--- NEW: Set Buzzer as Output
  digitalWrite(BUZZER_PIN, LOW); // Start Silent

  // Servo
  myServo.setPeriodHertz(50);
  myServo.attach(SERVO_PIN, 500, 2400);
  myServo.write(90); 

  // 2. Configure WiFi
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
}

void loop() {
  server.handleClient(); // Keep webpage alive

  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    readSensors(); 
    checkThresholds();
  }
}

// --- LOGIC FUNCTIONS ---

void readSensors() {
  float newTemp = dht.readTemperature();
  float newHum = dht.readHumidity();

  if (!isnan(newTemp) && !isnan(newHum)) {
    temp = newTemp;
    hum = newHum;
  }

  int rawGas = analogRead(MQPIN); 
  float volts = rawGas * (3.3 / 4095.0);
  if (volts <= 0) volts = 0.001; 
  float Rs = R2 * (3.3 - volts) / volts;
  float calculatedAcetone = 159.6 - (133.33 * (Rs / R0));
  
  if (calculatedAcetone < 0) calculatedAcetone = 0.0;
  
  acetone = calculatedAcetone;
  co2 = rawGas / 4.0; 
  
  // Debug
  Serial.print("Acetone: "); Serial.print(acetone);
  Serial.print(" | Temp: "); Serial.println(temp);
}

void checkThresholds() {
  // --- RISK SCENARIO (Acetone High) ---
  if(acetone > 100) {
    myServo.write(0);             // Open Hatch/Vent
    digitalWrite(BUZZER_PIN, HIGH); // <--- NEW: Alarm ON
  } else {
    myServo.write(90);              // Close Hatch/Vent
    digitalWrite(BUZZER_PIN, LOW);  // <--- NEW: Alarm OFF
  }

  // --- TEMP CONTROL ---
  if(temp > 30) {
    digitalWrite(RELAY_PIN, LOW); // Pump ON
    digitalWrite(BUZZER_PIN, HIGH);
  } else {
    digitalWrite(RELAY_PIN, HIGH); // Pump OFF
    digitalWrite(BUZZER_PIN, LOW);
  }
}

void handleData() {
  StaticJsonDocument<200> doc;
  doc["temperature"] = temp;
  doc["humidity"] = hum;
  doc["co2"] = round(co2 * 100) / 100.0;
  doc["aceton"] = round(acetone * 100) / 100.0;

  String jsonResponse;
  serializeJson(doc, jsonResponse);
  server.send(200, "application/json", jsonResponse);
}