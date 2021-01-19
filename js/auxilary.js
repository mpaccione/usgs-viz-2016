var delay = (function(){
          var timer = 0;
          return function(callback, ms){
            clearTimeout (timer);
            timer = setTimeout(callback, ms);
          };
        })();

// sometimes files wont download from server - check 
function loadCheck(){
    if (!earthLoaded || !cloudsLoaded) {
        if (pauseIntervals <= 16) {
            setTimeout(loadCheck, 500);
            pauseIntervals++;
        } else { loadText.textContent = "Textures Failed to Download\nPlease Reload Page"; }
    } 
}

function latLongToSphere(lat, lon, radius) {
    var phi   = (90-lat)*(Math.PI/180),
        theta = (lon+180)*(Math.PI/180),
        x = -((radius) * Math.sin(phi)*Math.cos(theta)),
        z = ((radius) * Math.sin(phi)*Math.sin(theta)),
        y = ((radius) * Math.cos(phi));

    return new THREE.Vector3(x,y,z);
}

function colorData(percentage){
    var rgbString = "",
        r = parseInt(percentage * 25.5),
        g = parseInt(((percentage * 25.5) - 255) * -1),
        b = 0;

    r = r < 0 ? 0 : r;
    rgbString = "rgb("+r+","+g+",0)";

    return rgbString;
}

function showMap(imageSrc, spotlightIntensity, ambientLightIntensity, clouds){
    var world = scene.getObjectByName("world").children[1],
        cloud = scene.getObjectByName("cloud");
    
    loader.load(
        imageSrc,
        function ( texture ) {
            if (!clouds){ scene.remove(cloud); }
            world.material.map = texture;
            world.material.needsUpdate = true;
            spotlight.intensity = spotlightIntensity;
            ambientLight.intensity = ambientLightIntensity;
            if (clouds){ scene.add(cloudObj); }
        },
        function ( xhr ) {},
        function ( xhr ) {
            alert( 'Globe Texture Failed to Download' );
        }
    );
    
}

function uncheckMaps(thisScope){
    var sim = document.getElementById("simulationMap"),
        phy = document.getElementById("physicalMap"),
        pol = document.getElementById("politicalMap"),
        tec = document.getElementById("tectonicMap");

    sim.checked = false,
    sim.disabled = false,
    phy.checked = false,
    phy.disabled = false,
    pol.checked = false,
    pol.disabled = false,
    tec.checked = false,
    tec.disabled = false,

    thisScope.checked = true,
    thisScope.disabled = true;
}

function uncheckTime(thisScope){
    var hour = document.getElementById("oneHour"),
        day = document.getElementById("oneDay"),
        week = document.getElementById("oneWeek"),
        month = document.getElementById("oneMonth");

    hour.checked = false,
    hour.disabled = false,
    day.checked = false,
    day.disabled = false,
    week.checked = false,
    week.disabled = false,
    month.checked = false,
    month.disabled = false;

    thisScope.checked = true,
    thisScope.disabled = true;
}

function autoRotationOn(){
    autoRotation = true;
    autoRotationBox.checked = true,
    mouseXRotation.checked = false,
    mouseYRotation.checked = false; 
}

function autoRotationOff(){
    autoRotation = false;
    autoRotationBox.checked = false,
    mouseXRotation.checked = true,
    mouseYRotation.checked = true; 
}

function rotationReset(param){
    worldObj.rotation.y = 0;
    if (param != "skipCloud"){ cloudObj.rotation.y = 0; }
    scene.getObjectByName("data").rotation.y = 0;
}

function removeTimeFrameData(index, scope){
    uncheckTime(scope);
    if (!mobile) {
        document.body.className = "disableMouse";
        autoRotation = false;
        rotationReset();
        stopRender(renderFrame);
        if (scene.getObjectByName("selected")){ scene.getObjectByName("world").remove(scene.getObjectByName("world").children[2]); }
        selectedQuake = false;
        scene.remove(scene.getObjectByName(dataArray[feedIndex].name));
        feedIndex = index;
        renderData();
    } else {
        feedIndex = index;
        listData();
    }
}

function stopRender(frameID){
    window.cancelAnimationFrame(frameID);
    frameID = undefined;
}