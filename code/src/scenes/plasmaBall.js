import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import GLBL from '../DielectricBreakdownModel/Globals';
import PlasmaBallSystem from '../DielectricBreakdownModel/PlasmaBallSystem';
import * as utils from '../DielectricBreakdownModel/Utils';
import GraphRenderer from '../DielectricBreakdownModel/GraphRenderer'



export default function plasmaBall() {

    //  create scene and setup camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 150);
    camera.lookAt(0, 0, 0);
    camera.layers.enable(1);

    // init the renderer
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;

    // init the composer
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new BloomPass(
        1,    // strength
        4,   // kernel size
        1,    // sigma ?
        2560,  // blur render target resolution
    );
    // bloomPass.renderToScreen = true

    const filmPass = new FilmPass(
        0.35,   // noise intensity
        0.025,  // scanline intensity
        648,    // scanline count
        false,  // grayscale
    );
    filmPass.renderToScreen = true;

    composer.addPass(bloomPass);
    composer.addPass(filmPass);

    // setup lightning
    const color = 0xFFFFFF;
    const intensity = 2;
    const light = new THREE.DirectionalLight(color, intensity);
    const ambient = new THREE.AmbientLight(new THREE.Color(1, 1, 1), 0.1);
    light.position.set(-1, 2, 4);
    light.layers.enable(1);
    ambient.layers.enable(1);
    scene.add(light);
    scene.add(ambient);

    // enable window resize response
    window.addEventListener('resize', () => {
        const height = window.innerHeight;
        const width = window.innerWidth;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    })

    // add controls to scene
    const controls = new OrbitControls(camera, renderer.domElement);

    // create a 3d object holder
    const objectsHolder = new THREE.Object3D();

    // create texture loader
    const texLoader = new THREE.TextureLoader();


    // create base
    const baseRup = 15;
    const baseRdown = 25;
    const baseH = 20;
    const baseGeo = new THREE.CylinderBufferGeometry(baseRup, baseRdown, baseH, 5);
    const baseMat = new THREE.MeshPhongMaterial({
        map: texLoader.load('/data/metal.jpg')
    })
    const base = new THREE.Mesh(baseGeo, baseMat);

    // create rod
    const rodR = 5;
    const rodH = 50;
    const rodGeo = new THREE.CylinderBufferGeometry(rodR, rodR, rodH, 32);
    const rodMat = new THREE.MeshPhongMaterial({
        color: '#000d1a'
    })
    const rod = new THREE.Mesh(rodGeo, rodMat);

    // create centerBall
    const cballR = 10;
    const cballGeo = new THREE.DodecahedronBufferGeometry(cballR, 3);
    const cballMat = new THREE.MeshBasicMaterial({
        map: texLoader.load('/data/cball.png')
    })
    const cball = new THREE.Mesh(cballGeo, cballMat);


    // create shell
    const shellR = rodH;
    const shellGeo = new THREE.DodecahedronBufferGeometry(shellR, 3);
    const shellMat = new THREE.MeshBasicMaterial({
        map: texLoader.load('/data/glass.jpg'),
        opacity: 0.25,
        transparent: true
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);


    // create targetball
    const tballR = 5;
    const tballGeo = new THREE.DodecahedronBufferGeometry(tballR, 3);
    const tballMat = new THREE.MeshPhongMaterial({
        color: '#004080'
    })
    const tball = new THREE.Mesh(tballGeo, tballMat);


    /* create plasma ball */

    // add base
    base.translateY(-1 * (rodH + baseH / 2));
    objectsHolder.add(base);

    // add rod
    rod.translateY(-1 * (rodH / 2));
    objectsHolder.add(rod);

    // add cball
    objectsHolder.add(cball);

    // add shell
    objectsHolder.add(shell);

    // add target ball
    tball.translateX(shellR + tballR);
    objectsHolder.add(tball);

    /* 
        init the system of charges
    */
    let origin = [0, 0, 0]
    let ballRadius = shellR;
    let targetDirection = [1, 0, 0];
    function createArcSystem(target) {
        return new PlasmaBallSystem(5.2, origin, target, 1.5, ballRadius, 3, (pos) => {
            return utils.distance(pos, origin) > ballRadius;
        })
    }

    let arcSystem = createArcSystem(targetDirection);

    // iterate once 
    arcSystem.init(targetDirection);
    arcSystem.evolve()
    let graph = arcSystem.graph;
    graph.calcChannels();

    // init the arc holder 3d object
    let arcHolder = new THREE.Object3D();
    arcHolder.layers.set(1);

    // init the graph renderer
    let graphRenderer = new GraphRenderer(graph, arcHolder, [
        GLBL.primCol,
        GLBL.secCol
    ], [GLBL.primRad, GLBL.secRad])

    // add to scene
    scene.add(objectsHolder);
    scene.add(arcHolder);



    /* Add Mouse Picker Controls
    @src : https://threejsfundamentals.org/threejs/lessons/threejs-picking.html
     */

    // helper class for picker 
    class PickHelper {
        constructor() {
            this.raycaster = new THREE.Raycaster();
            this.pickedObject = null;
        }
        pick(normalizedPosition, sceneObj, camera, time) {
            // cast a ray through the frustum
            this.raycaster.setFromCamera(normalizedPosition, camera);
            // get the list of objects the ray intersected
            const intersectedObjects = this.raycaster.intersectObjects(sceneObj.children);
            if (intersectedObjects.length) {
                // pick the first object. It's the closest one
                this.pickedObject = intersectedObjects[0];
                // console.log(this.pickedObject);
                // get point of hit
                const hitpt = this.pickedObject.point;
                hitpt.normalize();
                return hitpt;
            }
            return false;
        }
    }


    const pickPosition = { x: 0, y: 0 };
    const pickHelper = new PickHelper();
    clearPickPosition();

    function getCanvasRelativePosition(event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * canvas.width / rect.width,
            y: (event.clientY - rect.top) * canvas.height / rect.height,
        };
    }

    function setPickPosition(event) {
        const pos = getCanvasRelativePosition(event);
        pickPosition.x = (pos.x / canvas.width) * 2 - 1;
        pickPosition.y = (pos.y / canvas.height) * -2 + 1;  // note we flip Y
    }

    function clearPickPosition() {
        pickPosition.x = -100000;
        pickPosition.y = -100000;
    }
    window.addEventListener('mousemove', setPickPosition);
    window.addEventListener('mouseout', clearPickPosition);
    window.addEventListener('mouseleave', clearPickPosition);

    const speed = 2;
    // define scene update function
    const update = (time) => {

        // calculate new target direction
        const newTarget = pickHelper.pick(pickPosition, objectsHolder, camera, time);
        if (newTarget) {
            // translate target sphere to this point
            const r = shellR + tballR
            const newPos = newTarget.clone().multiplyScalar(r);
            tball.position.x = (newPos.x);
            tball.position.y = (newPos.y);
            tball.position.z = (newPos.z);

            //rotate the arcs
            arcHolder.rotation.y = Math.atan2(newTarget.y, newTarget.x);
            arcHolder.rotation.z = Math.acos(newTarget.z);
            
            // update target direction
            targetDirection = [newTarget.x, newTarget.y, newTarget.z];
        }


        for (let i = 0; i < speed - 1; i++)graphRenderer.updateScene();
        if (!graphRenderer.updateScene()) {
            // refresh
            scene.remove(arcHolder);
            arcSystem.init(targetDirection);
            arcSystem.evolve();
            graph = arcSystem.graph;
            arcHolder = new THREE.Object3D();
            arcHolder.layers.set(1);
            graphRenderer = new GraphRenderer(graph, arcHolder, [
                GLBL.primCol,
                GLBL.secCol
            ], [GLBL.primRad, GLBL.secRad]);
            scene.add(arcHolder);
        }

    }


    // setup sound before rendering
    // create an AudioListener and add it to the camera
    const listener = new THREE.AudioListener();
    camera.add(listener);

    // create a global audio source
    const sound = new THREE.Audio(listener);

    // load a sound and set it as the Audio object's buffer
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('/data/pb.mp3', function (buffer) {
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);
        sound.play();
    });



    // setup the render loop
    let then = 0;
    function render(now) {
        now *= 0.001;
        const delta = now - then;
        then = now;
        //update the scene
        update(now);

        renderer.clear();

        // render arcs of tesla coil
        camera.layers.set(1);
        composer.render(delta);

        // render model of tesla coil
        renderer.clearDepth();
        camera.layers.set(0);
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);

}

