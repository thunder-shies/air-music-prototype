import React, { useEffect, useRef, useState } from 'react';
import p5 from 'p5';
import * as Tone from 'tone';

const AirMusicVisualizer = () => {
    const canvasRef = useRef(null); // Reference to the p5.js canvas
    const [currentCity, setCurrentCity] = useState('HongKong'); // State to track the selected city
    const API_KEY = 'e4e64ea0-fde3-47a3-8766-7ee75e798d6d'; // API key for fetching AQI data
    const sketchRef = useRef(null); // Reference to the p5.js sketch instance
    const synthRef = useRef(null); // Reference to the Tone.js synth

    useEffect(() => {
        // Initialize Tone.js synth
        synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();

        // Create a new p5.js sketch
        let sketch = new p5((p) => {
            let particles = []; // Array to store particle objects
            let noiseOffsetX = 0; // Noise offset for X-axis
            let noiseOffsetY = 0; // Noise offset for Y-axis
            let mx = 0; // Mouse X position
            let my = 0; // Mouse Y position
            let aqius = 0; // AQI value

            // Function to map Y position to musical notes
            const getNote = (y) => {
                const notes = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5']; // Pentatonic scale notes
                const index = Math.floor(p.map(y, 0, window.innerHeight, 0, notes.length));
                return notes[index];
            };

            // Function to play sound based on mouse position
            const playSound = (x, y) => {
                if (Tone.context.state !== 'running') {
                    Tone.start();
                }

                const note = getNote(y);
                const volume = p.map(x, 0, window.innerWidth, -20, 0);

                // Modify synth parameters based on AQI
                if (aqius <= 50) {
                    synthRef.current.set({
                        oscillator: { type: 'sine' },
                        envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 }
                    });
                } else if (aqius <= 150) {
                    synthRef.current.set({
                        oscillator: { type: 'triangle' },
                        envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.8 }
                    });
                } else {
                    synthRef.current.set({
                        oscillator: { type: 'sawtooth' },
                        envelope: { attack: 0.02, decay: 0.4, sustain: 0.3, release: 0.5 }
                    });
                }

                synthRef.current.triggerAttackRelease(note, '8n', undefined, volume);
            };

            p.setup = () => {
                p.createCanvas(window.innerWidth, window.innerHeight); // Create a full-screen canvas
                loadAQIData(); // Load AQI data for the current city
            };

            p.mousePressed = () => {
                playSound(p.mouseX, p.mouseY); // Play sound on mouse press
            };

            p.draw = () => {
                p.background(0); // Clear the canvas with a black background

                if (p.mouseIsPressed) {
                    mx = p.lerp(mx, p.mouseX, 0.09); // Smoothly interpolate mouse X position
                    my = p.lerp(my, p.mouseY, 0.09); // Smoothly interpolate mouse Y position
                    let particle = new Particle(mx, my); // Create a new particle at the interpolated position
                    particles.push(particle); // Add the particle to the array
                }

                // Update and display particles
                for (let i = particles.length - 1; i >= 0; i--) {
                    particles[i].update();
                    particles[i].show();
                    if (particles[i].onDestroy()) {
                        particles.splice(i, 1); // Remove particles that are no longer visible
                    }
                }
            };

            // Particle class to represent visual elements
            class Particle {
                constructor(x, y) {
                    this.x = x;
                    this.y = y;
                    this.vx = p.random(-5, 5); // Random horizontal velocity
                    this.vy = p.random(-6, -1); // Random vertical velocity
                    this.size = p.random(window.innerWidth / 25, window.innerWidth / 12); // Random size
                    this.alpha = 255; // Initial transparency
                    this.color = this.getColorByAQI(aqius); // Color based on AQI
                }

                // Determine color based on AQI value
                getColorByAQI(aqi) {
                    if (aqi <= 50) {
                        return p.color(156, 216, 78);
                    } else if (aqi <= 100) {
                        return p.color(250, 207, 57);
                    } else if (aqi <= 150) {
                        return p.color(243, 114, 73);
                    } else if (aqi <= 200) {
                        return p.color(246, 94, 95);
                    } else if (aqi <= 300) {
                        return p.color(160, 112, 182);
                    } else {
                        return p.color(160, 106, 123);
                    }
                }

                // Display the particle
                show() {
                    p.noStroke();
                    p.fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], this.alpha);
                    p.ellipse(this.x, this.y, this.size);
                }

                // Update particle position and transparency
                update() {
                    this.x += this.vx;
                    this.y += this.vy;
                    this.size -= 0.2;
                    this.alpha -= 5;
                }

                // Check if the particle should be destroyed
                onDestroy() {
                    return this.alpha < 0 || this.size < 0;
                }
            }

            // Function to load AQI data for the current city
            async function loadAQIData() {
                const locations = {
                    'Bangkok': `http://api.airvisual.com/v2/city?city=Bangkok&state=Bangkok&country=Thailand&key=${API_KEY}`,
                    'HongKong': `http://api.airvisual.com/v2/city?city=Hong Kong&state=Hong Kong&country=Hong Kong&key=${API_KEY}`,
                    'Beijing': `https://api.airvisual.com/v2/city?city=Beijing&state=Beijing&country=China&key=${API_KEY}`,
                    'Melbourne': `http://api.airvisual.com/v2/city?city=Melbourne&state=Victoria&country=Australia&key=${API_KEY}`,
                };

                try {
                    const response = await fetch(locations[currentCity]);
                    if (!response.ok) {
                        throw new Error('Failed to fetch AQI data');
                    }
                    const data = await response.json();
                    aqius = data.data.current.pollution.aqius; // Extract AQI value
                    console.log(aqius);
                } catch (error) {
                    console.error(error);
                    aqius = null;
                }
            }
        }, canvasRef.current);

        sketchRef.current = sketch;

        return () => {
            if (sketchRef.current) {
                sketchRef.current.remove(); // Clean up the p5.js sketch
            }
            if (synthRef.current) {
                synthRef.current.dispose(); // Dispose of the Tone.js synth
            }
        };
    }, [currentCity]);

    // Function to start audio context
    const startAudio = async () => {
        await Tone.start();
        console.log('Audio is ready');
    };

    return (
        <div className="relative w-full h-screen">
            <div ref={canvasRef} className="absolute inset-0" />
            <div className="absolute top-4 right-4 flex gap-2 z-10">
                <button
                    onClick={startAudio}
                    className="px-4 py-2 rounded-lg bg-green-500 text-white mr-4"
                >
                    Start Audio
                </button>
                {['Bangkok', 'HongKong', 'Beijing', 'Melbourne'].map(city => (
                    <button
                        key={city}
                        onClick={() => setCurrentCity(city)}
                        className={`px-4 py-2 rounded-lg ${currentCity === city
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-500 text-white opacity-75 hover:opacity-100'
                            }`}
                    >
                        {city}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AirMusicVisualizer;