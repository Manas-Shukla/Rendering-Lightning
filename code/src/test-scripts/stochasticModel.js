import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BloomPass } from 'three/examples/jsm/postprocessing/BloomPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module';


const stochasticModel = () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 100);
    camera.lookAt(0, 0, 0);
    const canvas = document.querySelector('#c');
    const renderer = new THREE.WebGLRenderer({ canvas });

    {
        const color = 0xFFFFFF;
        const intensity = 2;
        const light = new THREE.DirectionalLight(color, intensity);
        light.position.set(-1, 2, 4);
        scene.add(light);
    }


    renderer.setSize(window.innerWidth, window.innerHeight);
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new BloomPass(
        2,    // strength
        9,   // kernel size
        0.7,    // sigma ?
        2560,  // blur render target resolution
    );
    composer.addPass(bloomPass);

    const filmPass = new FilmPass(
        0.35,   // noise intensity
        0.025,  // scanline intensity
        648,    // scanline count
        false,  // grayscale
    );
    filmPass.renderToScreen = true;
    // document.body.appendChild(renderer.domElement);
    composer.addPass(filmPass);



    window.addEventListener('resize', () => {
        const height = window.innerHeight;
        const width = window.innerWidth;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    })

    const controls = new OrbitControls(camera, renderer.domElement);
    // const geometry = new THREE.BoxGeometry(10, 10, 10);

    // const material = new THREE.MeshBasicMaterial({color:'white'});
    // const cube = new THREE.Mesh(geometry, material);
    // scene.add(cube);

    var material = new THREE.LineBasicMaterial({ color: 0x0000ff });
    var points = [];
    points.push(new THREE.Vector3(0, 60, 0));
    const base = new THREE.Vector3(0, -60, 0);

    var geometry = new THREE.BufferGeometry().setFromPoints(points);
    var line = new THREE.Line(geometry, material);

    scene.add(line);


    let flag = false;
    const R = 5;
    const update = () => {
        // setTimeout(() => {
        if (flag) {
            // cube.rotation.x += 0.01;
            return;
        }
        // scene.add(cube);
        // flag=true;
        // return;
        const prevP = points[points.length - 1];
        const theta = Math.random() * (Math.PI / 2.0);
        const phi = Math.random() * (Math.PI * 2);

        const y = -Math.sin(theta) * R;
        const x = Math.cos(theta) * Math.sin(phi) * R;
        const z = Math.cos(theta) * Math.cos(phi) * R;
        const delta = new THREE.Vector3(x, y, z);
        const newP = new THREE.Vector3(prevP.x + delta.x, prevP.y + delta.y, prevP.z + delta.z);
        // console.log(newP);
        if (newP.y < base.y) {
            flag = true;
            console.log('goal reached');
            return;
        }
        points.push(newP);
        for (let i = 0; i <= 1e8; i++);
        geometry = new THREE.BufferGeometry().setFromPoints(points);
        line.geometry = geometry
        // }, 1000)
    }

    const gui = new GUI();
    {
        const folder = gui.addFolder('BloomPass');
        folder.add(bloomPass.copyUniforms.opacity, 'value', 0, 2).name('strength');
        folder.open();
    }
    {
        const folder = gui.addFolder('FilmPass');
        folder.add(filmPass.uniforms.grayscale, 'value').name('grayscale');
        folder.add(filmPass.uniforms.nIntensity, 'value', 0, 1).name('noise intensity');
        folder.add(filmPass.uniforms.sIntensity, 'value', 0, 1).name('scanline intensity');
        folder.add(filmPass.uniforms.sCount, 'value', 0, 1000).name('scanline count');
        folder.open();
    }

    let then = 0;
    function render(now) {
        now *= 0.001;
        const deltaTime = now - then;
        then = now;
        // renderer.render(scene, camera);
        update();
        composer.render(deltaTime);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    // const GameLoop = () => {
    //     requestAnimationFrame(GameLoop);
    //     update();
    //     render();
    // }
    // GameLoop()

}

export default stochasticModel;