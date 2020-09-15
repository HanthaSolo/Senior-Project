#include <Adafruit_BMP280.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_CCS811.h>
#include "MutichannelGasSensor.h"
#include <Wire.h>

//NTP library 
#include <NTPClient.h>
#include <WiFiUdp.h>

// Define NTP Client to get time
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP);

// WebSocket and WiFi Library
#include <WiFi.h>
#include <WebSocketClient.h>

#define WIFI_SSID "Ryan&Charles-2.4GHz" // change with your own wifi ssid
#define WIFI_PASS "timyola06" // change with your own wifi password

// Server infos
#define HOST "192.168.0.117"
#define PORT 8010
#define PATH "/sensor-data"

// WebSocket Clients
WebSocketClient webSocketClient;
WiFiClient client;

// Sensor Data and Time variables
String dataToSend;// update this with the value you wish to send to the server
String Time;

// Sensor variables
Adafruit_CCS811 ccs;
Adafruit_BMP280 bmp; 
String ccsData;
String bmpData;
String mgsData;

// Variables to save date and time
String formattedDate;
String dayStamp;
String timeStamp;

void setup(){
    Serial.begin(115200);
    ccs_setup();
    bmp_setup();
   // mgs_setup();
    
    wifi_setup();

}

void loop() {

    ccsData = get_ccs_data();
    bmpData = get_bmp_data();
    mgsData = get_mgs_data();
    Time = get_time();

    // String
    dataToSend = "time=" + Time + ccsData +  bmpData; //+ mgsData;
    
    if (client.connected()) {
 
 
        webSocketClient.sendData(dataToSend);
 
    } else {
        Serial.println("Client disconnected. Trying to reconnecting...");
        initWebSocket();
        delay(3000);
    }
 
  delay(1000);
 
}

void wifi_setup() {
    
    // try to connect to the wifi
    if(connect() == 0) { return ; }

    // once connected to the wifi, let's reach our server
    if(initWebSocket() == 0) { return ; }
    
    }

void mgs_setup() {
    
    gas.begin(0x04);//the default I2C address of the slave is 0x04
    gas.powerOn();
    Serial.print("Firmware Version = ");
    Serial.println(gas.getVersion());
    
    }

void ccs_setup() {
    if(!ccs.begin()){
    Serial.println("Failed to start sensor! Please check your wiring.");
    while(1);
    }

    // Wait for the sensor to be ready
    while(!ccs.available());

    
}

void bmp_setup() {
    
    if (!bmp.begin()) {
    Serial.println(F("Could not find a valid BMP280 sensor, check wiring!"));
    while (1);
    }

  /* Default settings from datasheet. */
    bmp.setSampling(Adafruit_BMP280::MODE_NORMAL,     /* Operating Mode. */
                  Adafruit_BMP280::SAMPLING_X2,     /* Temp. oversampling */
                  Adafruit_BMP280::SAMPLING_X16,    /* Pressure oversampling */
                  Adafruit_BMP280::FILTER_X16,      /* Filtering. */
                  Adafruit_BMP280::STANDBY_MS_500); /* Standby time. */
  
}

String get_time() {
  while(!timeClient.update()) {
    timeClient.forceUpdate();
  }
  // The formattedDate comes with the following format:
  // 2018-05-28T16:00:13Z
  formattedDate = timeClient.getFormattedDate();
   String Time = String(formattedDate);
return Time;
}

String get_mgs_data() {
    
    String mgsData = "&NH3=" + String(gas.measure_NH3()) + 
                     "&CO=" + String(gas.measure_CO()) + 
                     "&NO2=" + String(gas.measure_NO2()) + 
                     "&C3H8=" + String(gas.measure_C3H8()) +  
                     "&C4H10=" + String(gas.measure_C4H10()) +
                     "&CH4=" + String(gas.measure_CH4()) + 
                     "&H2=" + String(gas.measure_H2()) + 
                     "&C2H5OH=" + String(gas.measure_C2H5OH());

    delay(500);
    return mgsData;
    }

String get_ccs_data() {
    String ccsData;
    if(ccs.available()){
        float temp = ccs.calculateTemperature();
        if(!ccs.readData()){
            Serial.println("CCS811: ");
            Serial.print("CO2: ");
            Serial.print(ccs.geteCO2());
            Serial.print("ppm, \nTVOC: ");
            Serial.print(ccs.getTVOC());
            Serial.print("ppb Temp:");
            Serial.println(temp);

            ccsData =   "&CO2=" + String(ccs.geteCO2()) + 
                        "&TVOC=" + String(ccs.getTVOC()) + 
                        "&altitude=" + String(temp);
                    
        }
        else{
            Serial.println("ERROR!");
            
        }
        
    }
    
    delay(500);
    return ccsData;
}

String get_bmp_data() {
    Serial.println("BMP280: ");
    Serial.print(F("Temperature = "));
    Serial.print(bmp.readTemperature());
    Serial.println(" *C");

    Serial.print(F("Pressure = "));
    Serial.print(bmp.readPressure()/100); //displaying the Pressure in hPa, you can change the unit
    Serial.println(" hPa");

    Serial.print(F("Approx altitude = "));
    Serial.print(bmp.readAltitude(1019.66)); //The "1019.66" is the pressure(hPa) at sea level in day in your region
    Serial.println(" m");                    //If you don't know it, modify it until you get your current altitude
    
    Serial.println();
    
    ccs.setEnvironmentalData(80, 23.3);
    delay(2000);

    String bmpData = "&temperature=" + String(bmp.readTemperature()) + 
                     "&pressure=" + String(bmp.readPressure()/100) + 
                     "&altitude=" + String(bmp.readAltitude(1019.66));
                    

    return bmpData;
}

void onDataReceived(String &data)
{
  Serial.println(data);

  if(data == "Info to be echoed back")
  {
    dataToSend = "Info to be echoed back";
  }
}

int initWebSocket()
{
  if(!client.connect(HOST, PORT)) {
    Serial.println("Connection failed.");
    return 0;
  }

  Serial.println("Connected.");
  webSocketClient.path = PATH;
  webSocketClient.host = HOST;

  if (!webSocketClient.handshake(client)) {
    Serial.println("Handshake failed.");
    return 0;
  }
  Serial.println("Handshake successful");
  return 1;
}

/*
  * Connect to the wifi (credential harcoded in the defines)
  */ 
int connect()
{
  WiFi.begin(WIFI_SSID, WIFI_PASS); 

  Serial.println("Waiting for wifi");
  int timeout_s = 30;
  while (WiFi.status() != WL_CONNECTED && timeout_s-- > 0) {
      delay(1000);
      Serial.print(".");
  }
  
  if(WiFi.status() != WL_CONNECTED)
  {
    Serial.println("unable to connect, check your credentials");
    return 0;
  }
  else
  {
    Serial.println("Connected to the WiFi network");
    Serial.println(WiFi.localIP());
    return 1;
  }
}
