import * as THREE from 'three';

function main() {
    const canvas = document.querySelector('#base');
    const renderer = new THREE.WebGLRenderer({antialias: true, canvas});

    // Kamera
    const fov = 60; 
    const aspect = window.innerWidth / window.innerHeight;  
    const near = 0.1;
    const far = 100; 
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 0, 0);

    const scene = new THREE.Scene();

    // Plattform
    const plateWidth = 15;
    const plateHeight = 0.5;
    const plateDepth = 10;
    const geometry = new THREE.BoxGeometry(plateWidth, plateHeight, plateDepth);
    const material = new THREE.MeshPhongMaterial({color: 0x44aa88});
    const plate = new THREE.Mesh(geometry, material);
    scene.add(plate);

    // Gitter passend zur Plattengröße
    const grid = new THREE.GridHelper(10, 10, 0xffffff, 0xffffff);
    grid.scale.x = plateWidth / plateDepth;
    grid.position.y = (plateHeight / 2) + 0.01;
    plate.add(grid);

    // Ball 
    const ballRadius = 0.5;
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshPhongMaterial({color: 0xff5533});
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    
    // Ball auf Platte setzen
    ball.position.set(0, (plateHeight / 2) + ballRadius, 0);
    scene.add(ball);

    // Licht
    const light = new THREE.DirectionalLight(0xFFFFFF, 2.5);
    light.position.set(5, 10, 7);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Input (später durch MediaPipe ersetzen)
    const targetTilt = { pitch: 0, roll: 0 };

    const sliderX = document.getElementById('tiltX');
    const sliderZ = document.getElementById('tiltZ');
    const valX = document.getElementById('valX');
    const valZ = document.getElementById('valZ');

    sliderX.addEventListener('input', (e) => {
        targetTilt.pitch = parseFloat(e.target.value);
        valX.textContent = Math.round(targetTilt.pitch * (180 / Math.PI));
    });

    sliderZ.addEventListener('input', (e) => {
        targetTilt.roll = -parseFloat(e.target.value);
        valZ.textContent = Math.round(parseFloat(e.target.value) * (180 / Math.PI));
    });

    renderer.setSize(window.innerWidth, window.innerHeight);

    function render() {
        plate.rotation.x += (targetTilt.pitch - plate.rotation.x) * 0.1;
        plate.rotation.z += (targetTilt.roll - plate.rotation.z) * 0.1;
        
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();