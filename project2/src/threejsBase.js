import * as THREE from 'three';
import * as CANNON from 'cannon-es';

function main() {
    const canvas = document.querySelector('#base');
    const renderer = new THREE.WebGLRenderer({antialias: true, canvas});

    // Kamera und Szene (Three.js)
    const fov = 60; 
    const aspect = window.innerWidth / window.innerHeight;  
    const near = 0.1;
    const far = 100; 
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    
    camera.position.set(0, 8, 12);
    camera.lookAt(0, 0, 0);

    const scene = new THREE.Scene();

    // Physik-Welt (cannon-es)
    const world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0), //Erdanziehung
    });

    // Physik-Materialien (cannon-es)
    const defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
        defaultMaterial,
        defaultMaterial,
        {
            friction: 0.4,    // Reibung
            restitution: 0.2, // Elastizität
        }
    );
    world.addContactMaterial(defaultContactMaterial);
    world.defaultContactMaterial = defaultContactMaterial;

    // Plattform (Three.js)
    const plateWidth = 15;
    const plateHeight = 0.5;
    const plateDepth = 10;
    const geometry = new THREE.BoxGeometry(plateWidth, plateHeight, plateDepth);
    const material = new THREE.MeshPhongMaterial({color: 0x44aa88});
    const plate = new THREE.Mesh(geometry, material);
    scene.add(plate);

    // Gitter passend zur Plattengröße (Three.js)
    const grid = new THREE.GridHelper(10, 10, 0xffffff, 0xffffff);
    grid.scale.x = plateWidth / plateDepth;
    grid.position.y = (plateHeight / 2) + 0.01;
    plate.add(grid);

    // Plattform-Body (cannon-es)
    const plateShape = new CANNON.Box(
        new CANNON.Vec3(plateWidth / 2, plateHeight / 2, plateDepth / 2)
    );
    const plateBody = new CANNON.Body({
        type: CANNON.Body.KINEMATIC,
        shape: plateShape,
    });
    world.addBody(plateBody);

    // Ball (Three.js)
    const ballRadius = 0.5;
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMaterial = new THREE.MeshPhongMaterial({color: 0xff5533});
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    
    // Ball auf Platte setzen (Three.js)
    ball.position.set(0, (plateHeight / 2) + ballRadius, 0);
    scene.add(ball);

    // Kugel-Body (cannon-es)
    const ballShape = new CANNON.Sphere(ballRadius);
    const ballBody = new CANNON.Body({
        mass: 1,
        shape: ballShape,
        position: new CANNON.Vec3(0, 3, 0), 
        angularDamping: 0.3, 
    });
    world.addBody(ballBody);

    // Licht (Three.js)
    const light = new THREE.DirectionalLight(0xFFFFFF, 2.5);
    light.position.set(5, 10, 7);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Input (später durch MediaPipe ersetzen) 
    const targetTilt = { pitch: 0, roll: 0 };
    const currentTilt = { pitch: 0, roll: 0 };

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

    // Render- und Physik-Loop
    const clock = new THREE.Clock();

    function render() {
        const deltaTime = Math.min(clock.getDelta(), 0.1); 

        currentTilt.pitch += (targetTilt.pitch - currentTilt.pitch) * 0.1;
        currentTilt.roll += (targetTilt.roll - currentTilt.roll) * 0.1;

        plateBody.quaternion.setFromEuler(currentTilt.pitch, 0, currentTilt.roll);

        world.step(1 / 60, deltaTime, 3);

        plate.position.copy(plateBody.position);
        plate.quaternion.copy(plateBody.quaternion);

        ball.position.copy(ballBody.position);
        ball.quaternion.copy(ballBody.quaternion);

        // Ball Reset
        if (ballBody.position.y < -10) {
            ballBody.position.set(0, 3, 0);
            ballBody.velocity.set(0, 0, 0);
            ballBody.angularVelocity.set(0, 0, 0);
        }

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();