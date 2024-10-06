// src/components/Orrery.js
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import axios from 'axios';

const Orrery = ({ isPlaying }) => {
  const mountRef = useRef(null);
  const planets = [];
  const [asteroids, setAsteroids] = useState([]);
  let renderer;

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
    if (renderer) return; // Prevent reinitializing the scene on every state change

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Set up the Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 150;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);

    // Add stars in the background
    const addStars = () => {
      const starMaterial = new THREE.PointsMaterial({ color: 0xffffff });
      const starGeometry = new THREE.SphereGeometry(1, 6, 6);
      const stars = new THREE.Group();
      
      for (let i = 0; i < 1000; i++) {
        const star = new THREE.Points(starGeometry, starMaterial);
        star.position.set(
          THREE.MathUtils.randFloatSpread(400),
          THREE.MathUtils.randFloatSpread(400),
          THREE.MathUtils.randFloatSpread(400)
        );
        stars.add(star);
      }
    
      scene.add(stars);
    };
    
    addStars();

    // Sun
    const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Text label with padding and background
    const createTextLabel = (text, color = 0xffffff) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = '30px Arial';
      context.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Background color
      context.fillRect(0, 0, 200, 50); // Padding and background
      context.fillStyle = '#fff'; // Text color
      context.fillText(text, 10, 40); // Position of the text

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(5, 2.5, 1); // Adjust size based on your needs
      return sprite;
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

    // Create planets with elliptical orbits and defined colors
    const createPlanet = (name, radius, color, semiMajorAxis, eccentricity, orbitalSpeed) => {
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshPhongMaterial({ color });
      const planet = new THREE.Mesh(geometry, material);
      planet.userData = { name, semiMajorAxis, eccentricity, orbitalSpeed, theta: 0 };
      planet.userData.distanceFromSun = semiMajorAxis * 149.6;
      scene.add(planet);
      planets.push(planet);

      createOrbit(semiMajorAxis, eccentricity, color);

      const label = createTextLabel(name);
      planet.add(label);
      label.position.set(3, 0, 0);
    };

    // Solar System planets with colors
    createPlanet('Mercury', 0.5, 0x808080, 6, 0.205, 0.04); // Grey
    createPlanet('Venus', 0.8, 0xffd700, 10, 0.007, 0.03); // Golden yellow
    createPlanet('Earth', 1, 0x00ff00, 15, 0.017, 0.02); // Green
    createPlanet('Mars', 0.6, 0xff0000, 20, 0.093, 0.015); // Red
    createPlanet('Jupiter', 2, 0xffa500, 30, 0.049, 0.008); // Orange
    createPlanet('Saturn', 1.7, 0xffff00, 40, 0.056, 0.006); // Yellow
    createPlanet('Uranus', 1.5, 0x00ffff, 55, 0.046, 0.004); // Cyan
    createPlanet('Neptune', 1.4, 0x0000ff, 70, 0.010, 0.003); // Blue

    // Create asteroid objects based on fetched data
    asteroids.forEach((asteroid) => {
      const semiMajorAxis = parseFloat(asteroid.semi_major_axis) || 50; // Default to 50 if undefined
      const eccentricity = parseFloat(asteroid.eccentricity) || 0.5; // Default to 0.5 if undefined
      const orbitalSpeed = 0.002;

      const isPHA = asteroid.is_potentially_hazardous_asteroid;
      const asteroidObj = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 32, 32),
        new THREE.MeshPhongMaterial({ color: isPHA ? 0xff073a : 0xffffff }) // Neon red for PHA
      );
      asteroidObj.userData = {
        name: "Asteroid (${asteroid.id})",
        semiMajorAxis,
        eccentricity,
        orbitalSpeed,
        theta: 0,
      };
      asteroidObj.userData.distanceFromSun = semiMajorAxis * 149.6;
      scene.add(asteroidObj);
      planets.push(asteroidObj);

      createOrbit(semiMajorAxis, eccentricity, isPHA ? 0xff073a : 0xffffff);

      const label = createTextLabel(isPHA ? 'PHA' : 'Asteroid', isPHA ? 0xff073a : 0xffffff);
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