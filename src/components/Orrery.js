// src/components/Orrery.js
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import axios from 'axios';

const Orrery = ({ isPlaying }) => {
  const mountRef = useRef(null);
  const planets = [];
  const [asteroids, setAsteroids] = useState([]);

  // Fetch asteroid data from the API
  useEffect(() => {
    const fetchAsteroids = async () => {
      try {
        const response = await axios.get('https://data.nasa.gov/resource/b67r-rgxc.json');
        setAsteroids(response.data);
      } catch (error) {
        console.error('Error fetching asteroid data', error);
      }
    };

    fetchAsteroids();
  }, []);

  useEffect(() => {
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Set up the Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 150;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    // Lighting
    const light = new THREE.PointLight(0xffffff, 1, 500);
    light.position.set(50, 50, 50);
    scene.add(light);

    // Add stars in the background
    const addStars = () => {
      const starGeometry = new THREE.BufferGeometry();
      const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });

      const starVertices = [];
      for (let i = 0; i < 1000; i++) {
        const x = THREE.MathUtils.randFloatSpread(200);
        const y = THREE.MathUtils.randFloatSpread(200);
        const z = THREE.MathUtils.randFloatSpread(200);
        starVertices.push(x, y, z);
      }
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);
    };

    addStars();

    // Sun
    const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Text label creation helper
    const createTextLabel = (text, color = 0xffffff) => {
      const loader = new FontLoader();
      return new Promise((resolve, reject) => {
        loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', (font) => {
          const geometry = new TextGeometry(text, {
            font: font,
            size: 1,
            height: 0.1,
          });
          const material = new THREE.MeshBasicMaterial({ color });
          const textMesh = new THREE.Mesh(geometry, material);
          resolve(textMesh);
        }, undefined, reject);
      });
    };

    // Add visual orbits
    const createOrbit = (semiMajorAxis, eccentricity, color) => {
      const curve = new THREE.EllipseCurve(
        -semiMajorAxis * eccentricity, 0,
        semiMajorAxis, semiMajorAxis * Math.sqrt(1 - Math.pow(eccentricity, 2)),
        0, 2 * Math.PI, false, 0
      );
      const points = curve.getPoints(100);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color });
      const ellipse = new THREE.Line(geometry, material);
      ellipse.rotation.x = Math.PI / 2;
      scene.add(ellipse);
    };

    // Create planets with elliptical orbits
    const createPlanet = async (name, radius, color, semiMajorAxis, eccentricity, orbitalSpeed) => {
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshBasicMaterial({ color });
      const planet = new THREE.Mesh(geometry, material);
      planet.userData = { name, semiMajorAxis, eccentricity, orbitalSpeed, theta: 0 };
      planet.userData.distanceFromSun = semiMajorAxis * 149.6;
      scene.add(planet);
      planets.push(planet);

      createOrbit(semiMajorAxis, eccentricity, color);

      const label = await createTextLabel(name);
      planet.add(label);
      label.position.set(3, 0, 0);
    };

    // Solar System planets
    createPlanet('Mercury', 0.5, 0x808080, 6, 0.205, 0.04);
    createPlanet('Venus', 0.8, 0xffd700, 10, 0.007, 0.03);
    createPlanet('Earth', 1, 0x0000ff, 15, 0.017, 0.02);
    createPlanet('Mars', 0.6, 0xff0000, 20, 0.093, 0.015);
    createPlanet('Jupiter', 2, 0xffa500, 30, 0.049, 0.008);
    createPlanet('Saturn', 1.7, 0xffff00, 40, 0.056, 0.006);
    createPlanet('Uranus', 1.5, 0x00ffff, 55, 0.046, 0.004);
    createPlanet('Neptune', 1.4, 0x0000ff, 70, 0.010, 0.003);

    // Create asteroid objects based on fetched data
    asteroids.forEach(async (asteroid) => {
      const semiMajorAxis = parseFloat(asteroid.semi_major_axis || 50);
      const eccentricity = parseFloat(asteroid.eccentricity || 0.5);
      const orbitalSpeed = 0.002;

      const isPHA = asteroid.pha === 'Y';
      const asteroidObj = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 32, 32),
        new THREE.MeshBasicMaterial({ color: isPHA ? 0xff0000 : 0xffffff })
      );
      asteroidObj.userData = { name: `Asteroid (${asteroid.spk_id})`, semiMajorAxis, eccentricity, orbitalSpeed, theta: 0 };
      asteroidObj.userData.distanceFromSun = semiMajorAxis * 149.6;
      scene.add(asteroidObj);
      planets.push(asteroidObj);

      createOrbit(semiMajorAxis, eccentricity, 0xffffff);

      const label = await createTextLabel(isPHA ? 'PHA' : 'Asteroid', isPHA ? 0xff0000 : 0xffffff);
      asteroidObj.add(label);
      label.position.set(2, 0, 0);
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      if (isPlaying) {
        planets.forEach((planet) => {
          planet.userData.theta += planet.userData.orbitalSpeed;
          const a = planet.userData.semiMajorAxis;
          const e = planet.userData.eccentricity;
          const theta = planet.userData.theta;

          planet.position.x = a * (Math.cos(theta) - e);
          planet.position.z = a * Math.sin(theta);
        });
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      mountRef.current.removeChild(renderer.domElement);
    };
  }, [isPlaying, asteroids]);

  return <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />;
};

export default Orrery;
