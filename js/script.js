
// couple of constants
var POS_X = 1800,
    POS_Y = 500,
    POS_Z = 600,
    WIDTH = window.innerWidth*0.6,
    HEIGHT = window.innerHeight,
    FOV = 50,
    NEAR = 1,
    FAR = 4000,
    init = false,
    items = [],
    quakes = [],
    quakeTitle = "",
    quakesMag = [],
    quakesPlace = [],
    quakesTime = [],
    quakeCount = 0,
    mapDiv = document.getElementById("globe"),
    loadText = document.getElementById("loadText"),
    leftMenu = document.getElementById("leftMenu"),
    rightMenu = document.getElementById("rightMenu"),
    tbody = document.getElementById("quakeData").childNodes[3],
    quakeTotal = document.getElementById("quakeTotal"),
    autoRotationBox = document.getElementById("autoRotation"),
    mouseXRotation = document.getElementById("mouseXRotation"),
    mouseYRotation = document.getElementById("mouseYRotation"),
    selectedQuake = false,
    xhr = [],
    feedIndex = 3,
    xhrComplete = 0,
    timer = null,
    mouseDown = false,
    earthLoaded = false,
    cloudsLoaded = false,
    pauseIntervals = 0,
    autoRotation = true,
    mobile = null,
    touch = null,
    dataArray = [],
    feedObject = {
        url: {},
        quakesTitle: {
            "0": null,
            "1": null,
            "2": null,
            "3": null
        },
        quakesCount: {
            "0": null,
            "1": null,
            "2": null,
            "3": null,
        },
        quakesCoord: {
            "0": null,
            "1": null,
            "2": null,
            "3": null,
        },
        quakesMag: {
            "0": null,
            "1": null,
            "2": null,
            "3": null
        },
        quakesPlace: {
            "0": null,
            "1": null,
            "2": null,
            "3": null
        },
        quakesTime: {
            "0": null,
            "1": null,
            "2": null,
            "3": null
        }
    };
    

// some global variables and initialization code
// simple basic renderer
var renderer = new THREE.WebGLRenderer({antialias:true}),
    camera = new THREE.PerspectiveCamera(FOV,WIDTH/HEIGHT,NEAR,FAR),
    scene = new THREE.Scene(),
    loader = new THREE.TextureLoader(),
    spGeo = new THREE.SphereBufferGeometry(600,50,50),
    worldObj = new THREE.Object3D(),
    cloudObj = new THREE.Object3D(),
    clock = new THREE.Clock(),
    controls = new THREE.OrbitControls(camera);

// mobile check and touch check
mobile = window.innerWidth <= 800 ? true : false;
touch = 'ontouchstart' in document.documentElement ? true : false;
window.addEventListener("resize", function(){
    delay(function(){ 
        mobile = window.innerWidth <= 800 ? true : false;
        HEIGHT = window.innerHeight;
        WIDTH = window.innerWidth*0.6;
        renderer.setSize(WIDTH, HEIGHT);
        camera.aspect = WIDTH / HEIGHT;
        camera.updateProjectionMatrix();
    }, 500);
});

// setup dataArray, render in target element, setup a camera that points center, add camera to scene
for (var i = 0; i < 4; i++) {
    var temp = new THREE.Object3D();
    temp.name = "data";
    dataArray.push(temp);
}

camera.name = "camera";
worldObj.name = "world";
cloudObj.name = "cloud";
loader.setPath( 'img/' );
renderer.setSize(WIDTH,HEIGHT);
renderer.setClearColor(0x000000);
mapDiv.appendChild(renderer.domElement);
camera.position.set(POS_X,POS_Y, POS_Z);
camera.lookAt(new THREE.Vector3(0,0,0));
scene.add(camera);


function addDataListeners(type){
    loadText.textContent = "Adding Data Listeners";

     // quake list listener for rotation on type
    for (var i = document.getElementsByTagName("tr").length - 1; i >= 1; i--) {
        document.getElementsByTagName("tr")[i].addEventListener(type, function(i){

            autoRotationOff();
            rotationReset("skipCloud");

            if (selectedQuake) {
                document.getElementsByClassName("selected")[0].className = "";
                worldObj.remove(worldObj.getObjectByName("selected"));
                scene.remove(scene.getObjectByName("selected"));
            }

            var selectedTime = this.getAttribute("data-time"),
                selectedRadius = this.getAttribute("data-mag") * 5,
                selectedGeo = new THREE.SphereGeometry(selectedRadius, 50, 50),
                rgb = colorData(this.getAttribute("data-mag")),
                sphereColor = new THREE.Color(rgb),
                selectedTexture = new THREE.MeshBasicMaterial({color: sphereColor, transparent: true, opacity: 0.5}),
                selectedMesh = new THREE.Mesh(selectedGeo, selectedTexture),
                altitude = 1400,
                coeff = 1 + altitude/600,
                quakeVector = latLongToSphere(this.getAttribute("data-lat"), this.getAttribute("data-long"), 600),
                cameraPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z },
                tween = new TWEEN.Tween(cameraPos)
                        .to({ x: quakeVector.x * -coeff, y: quakeVector.y * coeff, z: quakeVector.z * -coeff }, 1500)
                        .onUpdate(function() { 
                            camera.position.set(this.x, this.y, this.z);
                            camera.lookAt(scene.getObjectByName("world").position);
                        })
                        .start();

            this.className = "selected " + selectedTime;
            selectedMesh.name = "selected";
            selectedMesh.position.set(-quakeVector.x, quakeVector.y, -quakeVector.z);
            worldObj.add(selectedMesh);

            if (!selectedQuake) { selectedQuake = true; }
          
        });
    }
}

function addSettingListeners(type){
    loadText.textContent = "Adding Setting Listeners";

    // data timeframe
    document.getElementById("oneHour").addEventListener(type, function(){
        removeTimeFrameData(0, this);
    });

    document.getElementById("oneDay").addEventListener(type, function(){
        removeTimeFrameData(1, this);
    });

    document.getElementById("oneWeek").addEventListener(type, function(){
        removeTimeFrameData(2, this);
    });

    document.getElementById("oneMonth").addEventListener(type, function(){
        removeTimeFrameData(3, this);
    });

    // Cancel Rotation on type
    document.getElementById("globe").addEventListener(type, function(){
        autoRotationOff();
    });

    // remove mouseRotation and start autoRotation render
    document.getElementById("autoRotation").addEventListener(type, function(){
        if (this.checked) { autoRotationOn(); } 
        else { autoRotationOff(); }
    });

    // attach physical and clouds
    document.getElementById("simulationMap").addEventListener(type, function(){
        uncheckMaps(this);
        if (mobile) { showMap("earthmap1k_optimized.jpg", 0.9, 0.1, true); }
        else { showMap("earthmap4k_optimized.jpg", 0.9, 0.1, true); }
    });

    // attach physical mapping texture
    document.getElementById("physicalMap").addEventListener(type, function(){
        uncheckMaps(this);
        if (mobile) { showMap("earthmap1k_optimized.jpg", 0.9, 0.1, false); }
        else { showMap("earthmap4k_optimized.jpg", 0.9, 0.1, false); }
    });

    // attach political mapping texture
    document.getElementById("politicalMap").addEventListener(type, function(){
        uncheckMaps(this);
        if (mobile) { showMap("politicalmap1k_optimized.jpg", 0, 1, false); }
        else { showMap("politicalmap4k_optimized.jpg", 0, 1, false); }
    });

    //attach tectonic mapping texture
    document.getElementById("tectonicMap").addEventListener(type, function(){
        uncheckMaps(this);
        if (mobile) { showMap("tectonic1k_optimized.jpg", 0, 1, false); }
        else { showMap("tectonic4k_optimized.jpg", 0, 1, false); }
    });

}

// add earths core
function addCore(){
    loadText.textContent = "Creating Molten Core";

    var texture = mobile ? "moltenCore512_optimized" : "moltenCore1k_optimized",
        
        coreTexture = loader.load( "moltenCore1k_optimized.jpg", function(){

            var earthCore =  new THREE.MeshBasicMaterial( {
                map: coreTexture,
                side: THREE.BackSide
            }),
            core = new THREE.Mesh(spGeo, earthCore);
            core.scale.set(0.985, 0.985, 0.985);
            worldObj.add(core);

        }, 
        function(xhr){loadText.textContent = "Molten Core Texture Map "+ (xhr.loaded / xhr.total * 100) + "%"},
        function(xhr){loadText.textContent = "Error Loading Molten Core Texture Map";});
}

// add the earth
function addEarth(){
    loadText.textContent = "Creating Earth";

    var texture = mobile ? "earthmap1k_optimized.jpg" : "earthmap4k_optimized.jpg",
        bump = mobile ? "earthbump1k_optimized.jpg" : "earthbump4k_optimized.jpg",
        specular = mobile ? "earthspec1k_optimized.jpg" : "earthspec4k_optimized.jpg",

        planetTexture = loader.load( texture, function(){
            var planetBump = loader.load( bump , function(){
                var planetSpecular = loader.load( specular, function(){

                    var earthTexture =  new THREE.MeshPhongMaterial( {
                        map: planetTexture,
                        bumpMap: planetBump,
                        bumpScale: 0.5,
                        specularMap: planetSpecular
                    }),
                    earth = new THREE.Mesh(spGeo, earthTexture);
                    worldObj.add(earth);
                    scene.add(worldObj);
                    earthLoaded = true;
                    getJSON();
                    
                }, function(xhr){loadText.textContent = "Earth Specular Map "+ (xhr.loaded / xhr.total * 100) + "%"},
                function(xhr){loadText.textContent = "Error Loading Earth Specular Map";});

            }, function(xhr){loadText.textContent = "Earth Bump Map "+ (xhr.loaded / xhr.total * 100) + "%"},
            function(xhr){loadText.textContent = "Error Loading Earth Bump Map";});
        }, 
        function(xhr){loadText.textContent = "Earth Texture Map "+ (xhr.loaded / xhr.total * 100) + "%"},
        function(xhr){loadText.textContent = "Error Loading Earth Texture Map";});
}

// add clouds
function addClouds(){
    loadText.textContent = "Adding Atmosphere";

    var texture = mobile ? "earthClouds1k_optimized.jpg" : "earthClouds4k_optimized.jpg",

        cloudsTexture = loader.load( texture, function(){

            materialClouds = new THREE.MeshPhongMaterial({
                alphaMap : cloudsTexture,
                transparent : true,
                depthWrite  : false,
            }),
            meshClouds = new THREE.Mesh(spGeo, materialClouds);
            meshClouds.scale.set(1.015, 1.015, 1.015);
            cloudObj.add(meshClouds);
            scene.add(cloudObj);
            cloudsLoaded = true;

        }, function(xhr){loadText.textContent = "Cloud Texture Map "+ (xhr.loaded / xhr.total * 100) + "%"},
        function(xhr){loadText.textContent = "Error Loading Cloud Texture Map";});
        
}

// add a simple light
function addLights(){
    loadText.textContent = "Shining the Sun";
    spotlight = new THREE.DirectionalLight(0xffffff, 0.9);
    ambientLight = new THREE.AmbientLight(0xffffff);
    ambientLight.intensity = 0.1;
    spotlight.position.set(camera.position.x, camera.position.y, camera.position.z);
    spotlight.lookAt(new THREE.Vector3(0,0,0));
    ambientLight.updateMatrix();
    scene.add(spotlight);
    scene.add(ambientLight);
}

//add space background
function skybox(){
    loadText.textContent = "Creating Universe";

    var materialArray = [],
        imgArray = ["stars_fr.jpg", "stars_fr.jpg",
        "stars_fr.jpg", "stars_fr.jpg",
        "stars_fr.jpg", "stars_fr.jpg"];

    for (var i = 0; i < 6; i++){
        materialArray.push( new THREE.MeshBasicMaterial({
            map: loader.load( imgArray[i] ),
            side: THREE.BackSide
        }));
    }

    var skyboxMaterial = new THREE.MeshFaceMaterial( materialArray ),
        skyGeo = new THREE.BoxGeometry( 3000, 3000, 3000, 1, 1, 1),
        sky = new THREE.Mesh(skyGeo, skyboxMaterial);

    scene.add(sky);
}

function getJSON(){

    feedObject["url"]["0"] = "http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
    feedObject["url"]["1"] = "http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
    feedObject["url"]["2"] = "http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
    feedObject["url"]["3"] = "http://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson";

    var responseComplete = 0;

    for (var a = 0; a < 4; a++) {

        (function(n){
            loadText.textContent = "Requesting USGS Data "+(responseComplete+1)+"/4";
            xhr[n] = new XMLHttpRequest();
            xhr[n].open("GET", feedObject["url"][n], true);
            xhr[n].onreadystatechange = function() {
                if (xhr[n].readyState == 4) {
                    if(xhr[n].status == 200){
                        responseComplete++;
                        loadText.textContent = "Receiving USGS Data "+(responseComplete+1)+"/4";
                        if (responseComplete == 3) { loadText.textContent = "Computing Data: ~30 Second Wait"; }
                        if (responseComplete == 4) { transferComplete(); };
                    }
                    else {
                        loadText.textContent = "Error loading USGS Data";
                    }
                }
            };
            xhr[n].send(null);

            feedObject["quakesCoord"][n] = [],
            feedObject["quakesMag"][n] = [],
            feedObject["quakesPlace"][n] = [];
            feedObject["quakesTime"][n] = [];
        })(a);

        function transferComplete() {

            var currentEpoch = new Date().getTime();
    
            for (var n = 0; n < 4; n++) {

                var response = JSON.parse(xhr[n].responseText);
                
                loadText.textContent = "Loading USGS Data "+(n+1)+"/4";
                feedObject["quakesTitle"][n] = response["metadata"]["title"];
                quakeCount = 0;

                for (var i = 0, len = response["features"].length; i < len; i++) {
                    if (response["features"][i]["properties"]["mag"] != null && response["features"][i]["properties"]["mag"] != undefined) {
                        quakes.push(response["features"][i]);
                    }
                }
               
                for (var x = quakes.length - 1; x >= 0; x--) {
                    var quake = quakes[x],
                        quakeCoord = quake["geometry"]["coordinates"],
                        quakeMag = quake["properties"]["mag"],
                        quakePlace = quake["properties"]["place"];
                        quakeTime = quake["properties"]["time"];

                    quakeCount++;

                    feedObject["quakesCoord"][n].push(quakeCoord);
                    feedObject["quakesMag"][n].push(quakeMag);
                    feedObject["quakesPlace"][n].push(quakePlace);
                    feedObject["quakesTime"][n].push(currentEpoch - quakeTime);

                }

                feedObject["quakesCount"][n] = quakeCount;
    
            }

            if (mobile){ listData(); }
            else { renderData(); }

        }

    }

}

function renderData(listDataToggle){
    loadText.textContent = "Rendering Data";

    if (!init){

        for (var n = 0; n < 4; n++) {
                
            // the geometry that will contain all cubes
            var geom = new THREE.Geometry(),
                lookCenter = new THREE.Vector3(0,0,0);
            
            for (var i = feedObject["quakesCount"][n] - 1; i >= 0; i--) {

                // JSON serves long[0] and lat[1]
                // San Francisco 37.7749, -122.4194
                var quakeMag = feedObject["quakesMag"][n][i],
                    quakePlace = feedObject["quakesPlace"][n][i],
                    quakeTime = feedObject["quakesTime"][n][i],
                    quakeCoord = feedObject["quakesCoord"][n][i],
                    quakeVector = latLongToSphere(quakeCoord[1], quakeCoord[0], 600),
                    rgb = colorData(quakeMag),
                    cubeColor = new THREE.Color(rgb),
                    cubeMat = new THREE.MeshBasicMaterial({vertexColors: true}),
                    cubeHeight = (quakeMag * quakeMag * quakeMag) * 1.75;

                if (quakeMag < 0) { cubeHeight = 0; }

                var cubeGeom = new THREE.BoxGeometry(3,3,cubeHeight,1,1,1),
                    cube = new THREE.Mesh(cubeGeom, cubeMat);
                
                // set position of cube on globe, point to center, merge together for one draw call
                // cube.material.color.setStyle(rgb);
                for ( var j = 0; j < cubeGeom.faces.length; j ++ ) {
                    cubeGeom.faces[j].color = cubeColor;
                }

                cube.position.set(quakeVector.x, quakeVector.y, quakeVector.z);
                cube.lookAt(lookCenter);
                cube.updateMatrix();
                geom.merge(cube.geometry, cube.matrix);
            }
     
            // create a new mesh, containing all the other meshes.
            var combined = new THREE.Mesh(geom, cubeMat);
     
            // and add the total mesh to the scene
            dataArray[n].add(combined);
        }

        scene.add(dataArray[feedIndex]);

    } else {
        var object = scene.getObjectByName("data");
        scene.remove(object);
        scene.add(dataArray[feedIndex]);
    }

    // update DOM
    listData();

}

function listData(){
    loadText.textContent = "Displaying Data List";
    var frag = document.createDocumentFragment(),
        duplicateCount = 0,
        timeClass = null;
        msHour = feedIndex == 3 ? (3600000 + 900000) : (3600000 + 300000),
        msDay = feedIndex == 3 ? (86400000 + 900000) : (86400000 + 300000),
        msWeek = feedIndex == 3 ? (604800000 + 900000) : (604800000 + 300000);

    for (var i = 0; i < feedObject["quakesCount"][feedIndex]; i++) {
        var tr = document.createElement("TR"),
            timeNode = document.createElement("TD"),
            placeNode = document.createElement("TD"), 
            magNode = document.createElement("TD"),                    
            time = feedObject["quakesTime"][feedIndex][i],
            placeText = document.createTextNode(feedObject["quakesPlace"][feedIndex][i]),              
            magText = document.createTextNode(feedObject["quakesMag"][feedIndex][i]);
            timeData = document.createAttribute("data-time"),
            latData = document.createAttribute("data-lat"),
            longData = document.createAttribute("data-long"),
            magData = document.createAttribute("data-mag");

        latData.value = feedObject["quakesCoord"][feedIndex][i][1],
        longData.value = feedObject["quakesCoord"][feedIndex][i][0],
        magData.value = feedObject["quakesMag"][feedIndex][i],
        tr.setAttributeNode(latData);
        tr.setAttributeNode(longData);
        tr.setAttributeNode(magData);
      
        if (msWeek < time){ 
            timeClass = "month"; 
            timeData.value = "selectedMonth";
        }
        else if (msWeek < time && time > msDay ){ 
            timeClass = "week";
            timeData.value = "selectedWeek";
        }
        else if (msDay < time && time > msHour ){ 
            timeClass = "day";
            timeData.value = "selectedDay";
        }
        else { 
            timeClass = "hour";
            timeData.value = "selectedHour"; 
        }

        tr.setAttributeNode(timeData);
        timeNode.classList.add(timeClass, "triangle");
        placeNode.appendChild(placeText);
        placeNode.className = "place";
        magNode.appendChild(magText);
        magNode.className = "mag";
        tr.appendChild(timeNode); 
        tr.appendChild(placeNode);
        tr.appendChild(magNode);
        frag.appendChild(tr);                       
    }

    leftMenu.childNodes[1].textContent = feedObject["quakesTitle"][feedIndex];
    tbody.innerHTML = "";
    tbody.appendChild(frag);

    // sort table
    var sort = new Tablesort(document.getElementById('quakeData'), {
      descending: true
    });

    sort.refresh();
    document.getElementById("magCol").className = "sort-default";

    // remove duplicate USGS data 
    for (var i = feedObject["quakesCount"][feedIndex] - 1; i >= 1; i--) {
        if (document.getElementsByClassName("place")[i].textContent == document.getElementsByClassName("place")[i-1].textContent) {
            if (document.getElementsByClassName("mag")[i].textContent == document.getElementsByClassName("mag")[i-1].textContent) {
                document.getElementsByClassName("mag")[i].parentNode.remove();
                duplicateCount++;
            }
        }
    }

    if ((feedObject["quakesCount"][feedIndex] - duplicateCount) == 1) {
        quakeTotal.textContent = (feedObject["quakesCount"][feedIndex] - duplicateCount) + " Earthquake";
    } else {
        quakeTotal.textContent = (feedObject["quakesCount"][feedIndex] - duplicateCount) + " Earthquakes";
    }
    
    if (touch) {addDataListeners("touchend");}
    loadText.textContent = "...Waiting...";
    document.body.className = "";
    if (!mobile){
        addDataListeners("click");
        autoRotationOn(); 
        render();
        if (!cloudsLoaded) { alert("It appears the cloud texure didn't load. Please reload the page for the full experience"); };
    }
    if (!init){ document.getElementById("preloader").style.display = "none"; }
    init = true;
}

function render(){
    if (autoRotation && !selectedQuake) {
        renderFrame = requestAnimationFrame(render);
        worldObj.rotation.y += 0.001;
        dataArray[feedIndex].rotation.y += 0.001;
        cloudObj.rotation.y += 0.0016;
        spotlight.position.set(camera.position.x, camera.position.y, camera.position.z );
        renderer.render(scene, camera);
    } else if (!autoRotation && selectedQuake){
        renderFrame = requestAnimationFrame(render);
        cloudObj.rotation.y += 0.0006;
        spotlight.position.set(camera.position.x, camera.position.y, camera.position.z );
        TWEEN.update();
        scene.getObjectByName("selected").material.opacity = 0.5 * (1 + Math.sin( clock.getElapsedTime() ) );
        renderer.render(scene, camera);
    } else if (autoRotation && selectedQuake){
        renderFrame = requestAnimationFrame(render);
        worldObj.rotation.y += 0.001;
        dataArray[feedIndex].rotation.y += 0.001;
        cloudObj.rotation.y += 0.0016;
        spotlight.position.set(camera.position.x, camera.position.y, camera.position.z );
        TWEEN.update();
        scene.getObjectByName("selected").material.opacity = 0.5 * (1 + Math.sin( clock.getElapsedTime() ) );
        renderer.render(scene, camera);
    } else {
        renderFrame = requestAnimationFrame(render);
        cloudObj.rotation.y += 0.0006;
        spotlight.position.set(camera.position.x, camera.position.y, camera.position.z );
        renderer.render(scene, camera);
    }  
}

(function(){
    if (mobile) {
        if (touch) {addSettingListeners("touch")}
        else {addSettingListeners("click")}
        getJSON();
    } else {
        addLights();
        addCore();
        addEarth();
        addClouds();
        skybox();
        addSettingListeners("click");
        if (touch) {addSettingListeners("touch")}
        loadCheck();
    }
})();

