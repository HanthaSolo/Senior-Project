
import argparse
import json
import math
import os.path
import requests
from subprocess import Popen, PIPE, STDOUT, TimeoutExpired
import sys, string, os
import subprocess
import time

FTP_UPLOAD = "./ftp_send.sh"
NATIVE_DARWIN_WRAPPER = "./out/arsdk-native/staging/native-darwin-wrapper.sh"
BEBOP_SAMPLE = "./out/arsdk-native/staging/usr/bin/BebopSample"
RUN_SDK = "./out/arsdk-native/staging/native-wrapper.sh ./out/arsdk-native/staging/usr/bin/BebopSample"
HOST_SERVER = "http://192.168.2.3:8080/" ### IP address of HOST_SERVER

DELTA_LAT = 0.00003
URL = HOST_SERVER
postURL = URL + "mavCoords"
global_process = None

def restart_process(): ### Restarts a stalled process. Used to correct BrokenPipeError.
    p = subprocess.Popen([RUN_SDK], shell=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    global global_process
    global_process = p
    
def startSDK(): ### executes BebopSample and configures the process for Bebop 2.
    ### open the pipe and a Bebop 2 connection
    global global_process
    if global_process is None:
        global_process = subprocess.Popen([RUN_SDK], shell=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT) ### this will cause a broken pipe error if the drone is
                                      ### not on and connected.
    try:
        global_process.stdin.write(b'2\n') ### this part specifies Bebop 2.
        global_process.stdin.flush()
    except TimeoutExpired:
        global_process.kill()
        outs, errs = global_process.communicate()

    time.sleep(5)

    time.sleep(2)
    return global_process
        
def droneTakeoff(theProcess): ### Launches the drone in 'manual' mode. Does NOT execute a flight plan.
    if theProcess is None:
        restart_process()
    
    try:
        theProcess.stdin.write(b't\n')
        theProcess.stdin.flush()
    except TimeoutExpired:
        theProcess.kill()
        outs, errs = theProcess.communicate()

def droneReturnHome(theProcess): ### Land's the drone back at the 'take-off' position
    if theProcess is None:
        restart_process()
    
    try:
        theProcess.stdin.write(b'r\n')
        theProcess.stdin.flush()
    except TimeoutExpired:
        theProcess.kill()
        outs, errs = theProcess.communicate()

def droneLand(theProcess): ### Lands the drone normally.
    if theProcess is None:
        restart_process()

    try:
        
        theProcess.stdin.write(b' \n') ### spacebar to land
        theProcess.stdin.flush()
    except TimeoutExpired:
        theProcess.kill()
        outs, errs = theProcess.communicate()

def droneExecuteFlightplan(theProcess): ### Executes the flight plan currently on the drone.
    if theProcess is None:
        print("Process is None")
        restart_process()
    
    try:
        theProcess.stdin.write(b'p\n')
        theProcess.stdin.flush()
    except TimeoutExpired:
        theProcess.kill()
        outs, errs = theProcess.communicate()
    except BrokenPipeError:
        restart_process()
 
 ### Mavlink file generation 
def generateRectangle(lats, lons, alt, nCycles): ### generates a rectangle flightplan from app-generated coordinates.
    print(lats)
    print(lons)
    
    for i in range(0, 5): ### swaps lats and lons until we get the json messages fixed
        lats[i], lons[i] = swap(lats[i], lons[i])
    
    #print("alt: " + str(alt))
    horizontalSpeed = 5.0 # meters/second
    takeoff_land_speed = 0.0
    wayCount = 0                                  ### waypoint counter
    mavfile = open("flightPlan.mavlink", "w")
    mavfile.write("QGC WPL 120\n")
    mavfile.write("%d\t0\t3\t22\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"% ((wayCount), takeoff_land_speed, float(lats[0]), float(lons[0]), alt))
    wayCount+=1
    for i in range(0, nCycles):    
        mavfile.write("%d\t0\t3\t16\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"% ((wayCount), horizontalSpeed, float(lats[0]), float(lons[0]), alt))
        wayCount+=1
        mavfile.write("%d\t0\t3\t16\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"% ((wayCount), horizontalSpeed, float(lats[1]), float(lons[1]), alt))
        wayCount+=1
        mavfile.write("%d\t0\t3\t16\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"% ((wayCount), horizontalSpeed, float(lats[2]), float(lons[2]), alt))
        wayCount+=1
        mavfile.write("%d\t0\t3\t16\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"% ((wayCount), horizontalSpeed, float(lats[3]), float(lons[3]), alt))
        wayCount+=1
        mavfile.write("%d\t0\t3\t16\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"% ((wayCount), horizontalSpeed, float(lats[4]), float(lons[4]), alt))
        wayCount+=1
    mavfile.write("%d\t0\t3\t21\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"% ((wayCount), takeoff_land_speed, float(lats[0]), float(lons[0]), alt))
    mavfile.close()

def swap(x, y): ### Swaps in place. Used to correct lat/lons that were swapped originally.
    x = x + y
    y = x - y
    x = x - y
    return x, y

def generateSerpentine(lats, lons, alt, nCycles): ### Generates a serpentine flight plan inside the app generated coordinates
    
    coordArray = {}
    
    for i in range(0, 5): ### swaps lats and lons until we get the json messages fixed
        lats[i], lons[i] = swap(lats[i], lons[i])
    
    ### Put the coordinates in order from north to south, west to east...
    if (float(lats[1]) > float(lats[3])):
        tempLat = float(lats[1])
        endLat = float(lats[3])
        if (float(lons[1]) > float(lons[3])):
            tempLon = float(lons[1])
            endLon = float(lons[3])
        else:
            tempLon = float(lons[3])
            endLon = float(lons[1])
    else:
        tempLat = float(lats[3])
        endLat = float(lats[1])
        if (float(lons[1]) > float(lons[3])):
            tempLon = float(lons[1])
            endLon = float(lons[3])
        else:
            tempLon = float(lons[3])
            endLon = float(lons[1])


    deltaLat = tempLat - endLat
    deltaLon = tempLon - endLon

    print("deltaLat: %f, deltaLon: %f" %(deltaLat, deltaLon))

    thisLat = tempLat
    thisLon = tempLon


    wayCount = 0
    horizontalSpeed = 5.0
    takeoff_land_speed = 0.0
    mavfile = open("flightPlan.mavlink", "w")
    mavfile.write("QGC WPL 120\n")
    mavfile.write("%d\t0\t3\t22\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"% ((wayCount), takeoff_land_speed, float(lats[0]), float(lons[0]), alt)) #home
    coordArray[wayCount] = lats[0], lons[0]
    wayCount += 1
    mavfile.write("%d\t0\t3\t16\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"% ((wayCount), horizontalSpeed, float(lats[0]), float(lons[0]), alt))
    coordArray[wayCount] = lats[0], lons[0]
    
    for i in range(0, nCycles):
        print("in the for loop")

        thisLat = tempLat
        thisLon = tempLon
        
        wayCount += 1
        mavfile.write("%d\t0\t3\t16\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"%((wayCount), horizontalSpeed, float(thisLat), float(thisLon), alt)) #start
        coordArray[wayCount] = thisLat, thisLon
        wayCount += 1
        thisLon -= deltaLon # -->
        mavfile.write("%d\t0\t3\t16\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"%((wayCount), horizontalSpeed, float(thisLat), float(thisLon), alt))
        coordArray[wayCount] = thisLat, thisLon
        wayCount += 1
        print("this lat: %f,    end lat: %f" %(thisLat, endLat) )
        
        while(thisLat > endLat):
            print("this lat: %f,    end lat: %f" %(thisLat, endLat) )
            if (thisLat - (DELTA_LAT * 2) < endLat):
                new_delta_lat = (thisLat - endLat)
                thisLat -= new_delta_lat #VV
                mavfile.write("%d\t0\t3\t16\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"%((wayCount), horizontalSpeed, float(thisLat), float(thisLon), alt))
                coordArray[wayCount] = thisLat, thisLon
                wayCount += 1
                thisLon += deltaLon #<--
                mavfile.write("%d\t0\t3\t16\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"%((wayCount), horizontalSpeed, float(thisLat), float(thisLon), alt))
                coordArray[wayCount] = thisLat, thisLon
                wayCount += 1
            else:
                thisLat -= DELTA_LAT #VV
                mavfile.write("%d\t0\t3\t16\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"%((wayCount), horizontalSpeed, float(thisLat), float(thisLon), alt))
                coordArray[wayCount] = thisLat, thisLon
                wayCount += 1
                thisLon += deltaLon #<--
                mavfile.write("%d\t0\t3\t16\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"%((wayCount), horizontalSpeed, float(thisLat), float(thisLon), alt))
                coordArray[wayCount] = thisLat, thisLon
                wayCount += 1
                thisLat -= DELTA_LAT #VV
                mavfile.write("%d\t0\t3\t16\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"%((wayCount), horizontalSpeed, float(thisLat), float(thisLon), alt))
                coordArray[wayCount] = thisLat, thisLon
                wayCount += 1
                thisLon -= deltaLon # -->
                mavfile.write("%d\t0\t3\t16\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"%((wayCount), horizontalSpeed, float(thisLat), float(thisLon), alt))
                coordArray[wayCount] = thisLat, thisLon
                wayCount += 1

    mavfile.write("%d\t0\t3\t21\t0.000000\t%6f\t0.000000\t0.000000\t%6f\t%6f\t%6d\t1\r\n"% ((wayCount), takeoff_land_speed, float(lats[0]), float(lons[0]), alt)) #home
    coordArray[wayCount] = thisLat, thisLon
    
    ###So right here I need to iterate through this thing and make into into a json object to match the server
    ###It has 2 fields that hold arrays named "lat" and "lng"
    print("coordArray: ")
    print(coordArray)
    sLats = []
    sLons = []
    
    #testLat = "lat"
    #testLon = "lng"
    
    #test[testLat] = []
    #test[testLon] = []
    
    for key in coordArray:
        sLats.append(coordArray.get(key)[0])
        sLons.append(coordArray.get(key)[1])
    jDict = {}
    jDict['lat'] = sLats
    jDict['lng'] = sLons
    print("jDict:")
    print(jDict)
    postLats = requests.post(url = postURL, json=jDict)

    mavfile.close()

def ftpUpload(theProcess): ### uploads flightPlan.mavlink generated by generateSerpentine().
    subprocess.call("chmod +x ftp_send.sh", shell=True)
    output=subprocess.call("./ftp_send.sh", shell=True)
    print(output)
 
def sdkInitialize(): ### Begins the SDK process and runs the state machine
    
    try:
        global global_process
        global_process = startSDK()
        state = "wait"
        lats = []
        lons = []
        alt = 0
        nCycles = 0
        
        while 1:
            
            print("%s" %global_process.stdin)
            if state == "wait":
                print("before wait")
                time.sleep(1) ### wait 1 second and check the server again.
                print("wait")

            elif state == "upload":
                print("before upload")
                generateSerpentine(lats, lons, alt, nCycles) ### generate a serpentine flight path
                ftpUpload(global_process) ### upload the flightplan via file transfer protocol
                print("upload complete")

            elif state == "execute": ### executes the flightplan currently loaded onto the drone.
                print("before execute")
                droneExecuteFlightplan(global_process)
                print("execute")

            elif state == "land": ### lands the drone normally
                print("before land")
                droneLand(global_process)
                print("land")

            print(state)
            state, lats, lons, alt, nCycles = updateState(state)
            
    except Exception as e:
        print('Something went wrong...')
        print('Please make sure the drone is powered on and your shit is working.')
        print(e);
        
def updateState(state):
    lats = []
    lons = []
    alt = 0
    nCycles = 0
    execute = requests.get(url = URL + "execute")
    #print("execute status: %d" %execute.status_code)
    land = requests.get(url = URL + "land")
    #print("land status: %d" %land.status_code)
    upload = requests.get(url = URL + "matthew")
    #print("upload status: %d" %upload.status)
    

    if (upload.status_code == 204):
        print("nothing :(")
        #upload = request.get(url = URL)
    elif (upload.status_code !=204):

        coordinates = upload.json()
        print(coordinates)

        for i in range(0, 5):
            lats.append(float(coordinates['lat'][i]))
            lons.append(float(coordinates['lng'][i]))
    
        nCycles = int(coordinates['cycles'])
        alt = int(coordinates['alt']) 

    #print(alt)
    #print(lats, lons)

    nextState = "wait"
    
    if ((state == "execute") and (land.status_code != 204)):
        if (land.status_code == 200):
            nextState = "land"
        else:
            nextState = "wait"

    elif ((state == "land") and (upload.status_code != 204)):
        if (upload.status_code == 200):
            nextState = "upload"
        else:
            nextState = "wait"

    elif ((state == "upload") and ((execute.status_code != 204))):
        if ((execute.status_code == 200)):
            nextState = "execute flightPlan"
        else:
            nextState = "wait"

    elif ((state == "wait") and ( (upload.status_code != 204) or (execute.status_code != 204) or (land.status_code != 204) )):
        if(land.status_code == 200):
            nextState = "land"
        elif(upload.status_code == 200):
            nextState = "upload"
        elif(execute.status_code == 200):
            nextState = "execute"
        
        else:

            nextState = "wait"    

    return nextState, lats, lons, alt, nCycles
 
def main():
    sdkInitialize() ### start the SDK

    print("exiting...")
    
main()
