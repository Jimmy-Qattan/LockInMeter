#include <Arduino.h>
#include <AccelStepper.h>
#include <ArduinoBLE.h>

#define STEP_PIN 3
#define DIR_PIN 2

bool turnCalled = false;
bool drivingOver = false;


BLEService ardService("4f8b9504-0c21-4994-b330-350b96a44b41");
BLECharacteristic ardCharacteristic("d3311aa7-74a1-42de-83aa-e6014e590b44", BLERead | BLEWrite, 1);

int pos = 0;

AccelStepper stepper(AccelStepper::DRIVER, STEP_PIN, DIR_PIN);

void setup()
{
  BLE.begin();

  if (!BLE.begin())
  {
    Serial.println("BLE Unable to Initialize");
    while (1)
      ;
  }

  BLE.setLocalName("Swatter Time");
  BLE.setDeviceName("Swatter Time!!!");

  BLE.setAdvertisedService(ardService);
  ardService.addCharacteristic(ardCharacteristic);

  BLE.addService(ardService);

  BLE.advertise();

  Serial.println("BLE Service and Characteristic Successfully Initialized. Now to wait for this motherfucker to touch himself");

  stepper.setMaxSpeed(2000);
  stepper.setAcceleration(1000);
  stepper.moveTo(9999999);

  Serial.begin(9600);
}

void drive(AccelStepper &step, int dist, bool &driveOver, int acceleration, int speed)
{
  step.setAcceleration(acceleration);
  step.setSpeed(speed);

  if (driveOver == false)
  {
    step.moveTo(dist);
    step.runToPosition();
  }

  if (step.distanceToGo() == 0)
  {
    driveOver = true;
  }
}

void hitTimes(AccelStepper &step, int dist, int times, bool &ran, int acceleration, int speed)
{
  if (ran == false)
  {
    step.setAcceleration(acceleration);
    step.setSpeed(speed);
    for (int i = 0; i < times; i++)
    {
      step.moveTo(dist);
      step.runToPosition();
      // delay(2000);
      step.moveTo(-dist);
      step.runToPosition();
      // delay(2000);
      if (i == (times - 1))
      {
        ran = true;
      }
    }
  }
}

bool inProgress = false;

void loop()
{

  BLEDevice central = BLE.central();

  if (central)
  {
    while (central.connected())
    {
      if (ardCharacteristic.written())
      {
        byte value;
        ardCharacteristic.readValue(value);
        Serial.println(value);

        if (inProgress == false) {
          if (value == 1) {
            turnCalled = false;
            inProgress = true;

            hitTimes(stepper, 15, 1, turnCalled, 200, 50);
            delay(2000);
            turnCalled = false;
            delay(1000);
            inProgress = false;
          }
        }
      }
    }

    Serial.println("Disconnected");
  }
}
