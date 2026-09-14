#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>


const int oneWireBus = 4;        
const int voltageSensorPin = 34;    

 
const float SHUNT_RESISTANCE = 220.0; 
const float REFERENCE_VOLTAGE = 3.3;   
const float BATTERY_CAPACITY_RATED_AH = 2.0; 
const float COULOMB_EFFICIENCY = 1.0;  
const float V_OPEN_CIRCUIT = 3.7;            
const float V_MIN_CUTOFF = 3.0;              


const float w1 = 0.15; 
const float w2 = 0.25; 
const float w3 = 0.30; 
const float w4 = 0.15; 
const float w5 = 0.15; 
const float w6 = 1.00; 


SemaphoreHandle_t xBatteryMutex;

float globalTempC = 25.0; 
float globalVoltageDrop = 0.0;
float globalCurrentMA = 0.0;
float globalBHI = 100.0;


float s_v_val = 100.0, s_soc_val = 100.0, s_soh_val = 100.0, s_t_val = 100.0, s_r_val = 100.0;
float realEstVoltVal = 3.7;


float measuredCapacityAh = 2.0;              
float currentSOC = 100.0;             
unsigned long lastTimeChecked = 0;    


OneWire oneWire(oneWireBus);
DallasTemperature sensors(&oneWire);


TaskHandle_t xSensorTaskHandle = NULL;
TaskHandle_t xAlgorithmTaskHandle = NULL;
TaskHandle_t xTelemetryTaskHandle = NULL;


void vSensorTask(void *pvParameters);
void vAlgorithmTask(void *pvParameters);
void vTelemetryTask(void *pvParameters);

void setup() {
  Serial.begin(115200);
  delay(1000); 
  
  sensors.begin();
  pinMode(voltageSensorPin, INPUT);
  lastTimeChecked = millis();

 
  xBatteryMutex = xSemaphoreCreateMutex();

  if (xBatteryMutex != NULL) {
    // Task 1: Read raw sensor inputs (Core 0, High priority)
    xTaskCreatePinnedToCore(vSensorTask, "SensorTask", 2048, NULL, 3, &xSensorTaskHandle, 0);

    // Task 2: Process battery state & compute BHI (Core 1, Medium priority)
    xTaskCreatePinnedToCore(vAlgorithmTask, "AlgoTask", 2048, NULL, 2, &xAlgorithmTaskHandle, 1);

    // Task 3: Output details and RAM tracking via Serial (Core 1, Low priority)
    xTaskCreatePinnedToCore(vTelemetryTask, "TelemetryTask", 2048, NULL, 1, &xTelemetryTaskHandle, 1);
  } else {
    Serial.println("Error: Failed to create Mutex. System halted.");
    while(1);
  }
}

void loop() {
  vTaskDelete(NULL); 
}

// --- Task 1: Sensor Data Aggregation ---
void vSensorTask(void *pvParameters) {
  for (;;) {
  
    sensors.requestTemperatures(); 
    float localTempC = sensors.getTempCByIndex(0);

  
    int analogValue = analogRead(voltageSensorPin);
    float pinVoltage = (analogValue * REFERENCE_VOLTAGE) / 4095.0; 
    float localVoltageDrop = pinVoltage * 5.0; 

    float localCurrentMA = (localVoltageDrop / SHUNT_RESISTANCE) * 1000.0;

  
    if (xSemaphoreTake(xBatteryMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      if (localTempC != DEVICE_DISCONNECTED_C) {
        globalTempC = localTempC;
      }
      globalVoltageDrop = localVoltageDrop;
      globalCurrentMA = localCurrentMA;
      xSemaphoreGive(xBatteryMutex);
    }

   
    vTaskDelay(pdMS_TO_TICKS(2000));
  }
}

// --- Task 2: Mathematical Algorithms & Coulomb Counting ---
void vAlgorithmTask(void *pvParameters) {
  for (;;) {
    unsigned long currentTime = millis();
    float deltaTimeSeconds = (currentTime - lastTimeChecked) / 1000.0;
    float deltaTimeHours = deltaTimeSeconds / 3600.0; 
    lastTimeChecked = currentTime;

    float t_c, v_drop, c_ma;

   
    if (xSemaphoreTake(xBatteryMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
      t_c = globalTempC;
      v_drop = globalVoltageDrop;
      c_ma = globalCurrentMA;
      xSemaphoreGive(xBatteryMutex);
    } else {
   
      t_c = 25.0; v_drop = 0.0; c_ma = 0.0;
    }

    float current_Amps = c_ma / 1000.0; 

    
    float capacityDrawnAh = COULOMB_EFFICIENCY * current_Amps * deltaTimeHours;
    measuredCapacityAh -= capacityDrawnAh;
    if (measuredCapacityAh < 0.0) measuredCapacityAh = 0.0;

    float socReduction = (capacityDrawnAh / BATTERY_CAPACITY_RATED_AH) * 100.0;
    currentSOC -= socReduction;
    if (currentSOC > 100.0) currentSOC = 100.0;
    if (currentSOC < 0.0)   currentSOC = 0.0;

    float currentSOH = (measuredCapacityAh / BATTERY_CAPACITY_RATED_AH) * 100.0;
    
    float internalResistance = 0.0;
    if (current_Amps > 0.0001) { 
      internalResistance = (V_OPEN_CIRCUIT - v_drop) / current_Amps;
    }

    float realEstimatedBatteryVoltage = V_OPEN_CIRCUIT - v_drop;
    
    float S_v = ((realEstimatedBatteryVoltage - V_MIN_CUTOFF) / (V_OPEN_CIRCUIT - V_MIN_CUTOFF)) * 100.0;
    if (S_v > 100.0) S_v = 100.0;
    if (S_v < 0.0)   S_v = 0.0;

    float S_soc = currentSOC;
    float S_soh = currentSOH;

    float S_T = 100.0 - (abs(t_c - 25.0) * 4.0); 
    if (S_T < 0.0) S_T = 0.0;

    float S_r = 100.0 - (internalResistance * 0.5);
    if (S_r < 0.0) S_r = 0.0;

    float S_fault = 0.0;
    if (t_c > 45.0 || t_c < 5.0 || currentSOC < 10.0) {
      S_fault = 100.0; 
    }

    float BHI = (w1 * S_v) + (w2 * S_soc) + (w3 * S_soh) + (w4 * S_T) + (w5 * S_r) - (w6 * S_fault);
    if (BHI > 100.0) BHI = 100.0;
    if (BHI < 0.0)   BHI = 0.0;

    
    if (xSemaphoreTake(xBatteryMutex, pdMS_TO_TICKS(50)) == pdTRUE) {
      globalBHI = BHI;
      s_v_val = S_v;
      s_soc_val = S_soc;
      s_soh_val = S_soh;
      s_t_val = S_T;
      s_r_val = S_r;
      realEstVoltVal = realEstimatedBatteryVoltage;
      xSemaphoreGive(xBatteryMutex);
    }

    
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
}

// --- Task 3: Telemetry Reporting & Whole RAM Diagnostics ---
void vTelemetryTask(void *pvParameters) {
  for (;;) {
   
    vTaskDelay(pdMS_TO_TICKS(10000));

    float tempC, v_drop, c_ma, bhi, sv, s_soc, s_soh, s_t, s_r, real_v;

   
    if (xSemaphoreTake(xBatteryMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      tempC = globalTempC;
      v_drop = globalVoltageDrop;
      c_ma = globalCurrentMA;
      bhi = globalBHI;
      sv = s_v_val;
      s_soc = s_soc_val;
      s_soh = s_soh_val;
      s_t = s_t_val;
      s_r = s_r_val;
      real_v = realEstVoltVal;
      xSemaphoreGive(xBatteryMutex);
    } else {
      continue; // Skip output instance if data is temporarily locked
    }

    
    uint32_t totalRAM = ESP.getHeapSize();       // Absolute total system allocation pool
    uint32_t freeRAM  = ESP.getFreeHeap();       // System RAM remaining untouched
    uint32_t usedRAM  = totalRAM - freeRAM;      // Explicit usage footprint right now
    float usedPercent = ((float)usedRAM / totalRAM) * 100.0;

   
    uint32_t sensorFreeStack = uxTaskGetStackHighWaterMark(xSensorTaskHandle);
    uint32_t algoFreeStack = uxTaskGetStackHighWaterMark(xAlgorithmTaskHandle);
    uint32_t telemetryFreeStack = uxTaskGetStackHighWaterMark(NULL);

    Serial.println("----- COMPOSITE BHI METRICS REPORT -----");
    Serial.print("Temperature:         "); Serial.print(tempC); Serial.println(" ºC");
    Serial.print("V_load Drop:         "); Serial.print(v_drop); Serial.println(" V");
    Serial.print("Estimated Cell Volt: "); Serial.print(real_v); Serial.println(" V");
    Serial.print("I_load Current:      "); Serial.print(c_ma); Serial.println(" mA");
    
    Serial.println("--- Sub-System Scores (0-100) ---");
    Serial.print("  S_v (Volt Score):  "); Serial.println(sv, 2);
    Serial.print("  S_soc (SOC):       "); Serial.println(s_soc, 2);
    Serial.print("  S_soh (SOH):       "); Serial.println(s_soh, 2);
    Serial.print("  S_T (Temp):        "); Serial.println(s_t, 2);
    Serial.print("  S_r (Resist):      "); Serial.println(s_r, 2);
    
    Serial.println("--- Composite Results ---");
    Serial.print("  >> BATTERY BHI INDEX: "); Serial.print(bhi, 2); Serial.println(" % <<");
    
    Serial.println("--- Whole System RAM & Stack Usage ---");
    Serial.print("  Total Available RAM:   "); Serial.print(totalRAM); Serial.println(" bytes");
    Serial.print("  Currently USED RAM:    "); Serial.print(usedRAM);  Serial.print(" bytes ("); Serial.print(usedPercent, 1); Serial.println("%)");
    Serial.print("  Currently FREE RAM:    "); Serial.print(freeRAM);  Serial.println(" bytes");
    Serial.print("  Sensor Task Unused Stack:   "); Serial.print(sensorFreeStack); Serial.println(" bytes");
    Serial.print("  Algorithm Task Unused Stack:"); Serial.print(algoFreeStack); Serial.println(" bytes");
    Serial.print("  Telemetry Task Unused Stack:"); Serial.print(telemetryFreeStack); Serial.println(" bytes");
    Serial.println("----------------------------------------\n");
  }
}
