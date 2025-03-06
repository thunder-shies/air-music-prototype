import React, { useEffect, useRef, useState } from 'react';
import p5 from 'p5';
import * as Tone from 'tone';

const AirMusicVisualizer = () => {
    const canvasRef = useRef(null);
    const [currentCity, setCurrentCity] = useState('HongKong');
    const API_KEY = 'e4e64ea0-fde3-47a3-8766-7ee75e798d6d';
    const sketchRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Initialize synth refs for each city
    const synths = useRef({
        HongKong: new Tone.PolySynth(Tone.AMSynth).toDestination(),
        Bangkok: new Tone.PolySynth(Tone.FMSynth).toDestination(),
        Beijing: new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.1,
                decay: 0.2,
                sustain: 0.3,
                release: 1
            }
        }).toDestination(),
        Melbourne: new Tone.PolySynth(Tone.Synth).toDestination()
    });

    const cityMelodies = {
        HongKong: [
            ['E4', 'G4', 'A4', 'C5'],
            ['A4', 'C5', 'D5', 'E5'],
            ['G4', 'A4', 'C5', 'D5']
        ],
        Bangkok: [
            ['D4', 'F4', 'A4', 'C5'],
            ['C4', 'E4', 'G4', 'B4'],
            ['E4', 'G4', 'B4', 'D5']
        ],
        Beijing: [
            ['G3', 'A3', 'C4', 'D4'],
            ['E3', 'G3', 'A3', 'C4'],
            ['D3', 'F3', 'G3', 'A3']
        ],
        Melbourne: [
            ['F4', 'A4', 'C5', 'E5'],
            ['G4', 'B4', 'D5', 'F5'],
            ['A4', 'C5', 'E5', 'G5']
        ]
    };

    // Define AQI level thresholds and characteristics
    const aqiLevels = {
        good: { max: 50, color: [46, 204, 113] },
        moderate: { max: 100, color: [241, 196, 15] },
        unhealthySensitive: { max: 150, color: [230, 126, 34] },
        unhealthy: { max: 200, color: [231, 76, 60] },
        veryUnhealthy: { max: 300, color: [142, 68, 173] },
        hazardous: { max: 500, color: [155, 89, 182] }
    };

    const getAQILevel = (aqi) => {
        if (aqi <= aqiLevels.good.max) return 'good';
        if (aqi <= aqiLevels.moderate.max) return 'moderate';
        if (aqi <= aqiLevels.unhealthySensitive.max) return 'unhealthySensitive';
        if (aqi <= aqiLevels.unhealthy.max) return 'unhealthy';
        if (aqi <= aqiLevels.veryUnhealthy.max) return 'veryUnhealthy';
        return 'hazardous';
    };

    useEffect(() => {
        let particles = [];
        let currentMelodyIndex = 0;
        let currentNoteIndex = 0;
        let lastNoteTime = 0;
        let noteInterval = 500;
        let aqius = 50;

        const sketch = new p5((p) => {
            class Particle {
                constructor(x, y, aqiLevel) {
                    this.pos = p.createVector(x, y);
                    this.vel = p.createVector(p.random(-1, 1), p.random(-1, 1));
                    this.acc = p.createVector(0, 0);
                    this.lifespan = 255;
                    this.aqiLevel = aqiLevel;
                    this.color = aqiLevels[aqiLevel].color;
                    
                    // Adjust particle size and behavior based on AQI level
                    switch(aqiLevel) {
                        case 'good':
                            this.size = 5;
                            this.speedMultiplier = 0.5;
                            break;
                        case 'moderate':
                            this.size = 8;
                            this.speedMultiplier = 0.8;
                            break;
                        case 'unhealthySensitive':
                            this.size = 12;
                            this.speedMultiplier = 1.2;
                            break;
                        case 'unhealthy':
                            this.size = 15;
                            this.speedMultiplier = 1.5;
                            break;
                        case 'veryUnhealthy':
                            this.size = 18;
                            this.speedMultiplier = 2;
                            break;
                        case 'hazardous':
                            this.size = 20;
                            this.speedMultiplier = 2.5;
                            break;
                    }
                }

                update() {
                    // Add turbulence based on AQI level
                    const turbulence = p.createVector(
                        p.noise(this.pos.x * 0.01, this.pos.y * 0.01) - 0.5,
                        p.noise(this.pos.x * 0.01, this.pos.y * 0.01 + 1000) - 0.5
                    );
                    turbulence.mult(this.speedMultiplier);
                    this.acc.add(turbulence);
                    
                    this.vel.add(this.acc);
                    this.vel.limit(3 * this.speedMultiplier);
                    this.pos.add(this.vel);
                    this.acc.mult(0);
                    
                    // Adjust lifespan decay based on AQI level
                    this.lifespan -= 1 + this.speedMultiplier;
                }

                display() {
                    p.noStroke();
                    const alpha = this.lifespan;
                    p.fill(...this.color, alpha);
                    p.circle(this.pos.x, this.pos.y, this.size);
                }

                isDead() {
                    return this.lifespan < 0;
                }
            }

            const adjustSynthParameters = (aqiLevel) => {
                const synth = synths.current[currentCity];
                
                switch(aqiLevel) {
                    case 'good':
                        synth.set({
                            envelope: {
                                attack: 0.1,
                                decay: 0.2,
                                sustain: 0.3,
                                release: 0.8
                            },
                            volume: -12
                        });
                        noteInterval = 600; // Slower, calmer tempo
                        break;
                        
                    case 'moderate':
                        synth.set({
                            envelope: {
                                attack: 0.08,
                                decay: 0.3,
                                sustain: 0.4,
                                release: 0.7
                            },
                            volume: -10
                        });
                        noteInterval = 500;
                        break;
                        
                    case 'unhealthySensitive':
                        synth.set({
                            envelope: {
                                attack: 0.05,
                                decay: 0.4,
                                sustain: 0.5,
                                release: 0.6
                            },
                            volume: -8
                        });
                        noteInterval = 450;
                        break;
                        
                    case 'unhealthy':
                        synth.set({
                            envelope: {
                                attack: 0.03,
                                decay: 0.5,
                                sustain: 0.6,
                                release: 0.5
                            },
                            volume: -6
                        });
                        noteInterval = 400;
                        break;
                        
                    case 'veryUnhealthy':
                        synth.set({
                            envelope: {
                                attack: 0.02,
                                decay: 0.6,
                                sustain: 0.7,
                                release: 0.4
                            },
                            volume: -4
                        });
                        noteInterval = 350;
                        break;
                        
                    case 'hazardous':
                        synth.set({
                            envelope: {
                                attack: 0.01,
                                decay: 0.7,
                                sustain: 0.8,
                                release: 0.3
                            },
                            volume: -2
                        });
                        noteInterval = 300; // Faster, more intense tempo
                        break;
                }
            };

            p.setup = () => {
                const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
                canvas.parent(canvasRef.current);
                p.background(0);
            };

            const playNote = () => {
                if (isPlaying) {
                    const aqiLevel = getAQILevel(aqius);
                    adjustSynthParameters(aqiLevel);
                    
                    const melodies = cityMelodies[currentCity];
                    const currentMelody = melodies[currentMelodyIndex];
                    const note = currentMelody[currentNoteIndex];
                    
                    synths.current[currentCity].triggerAttackRelease(note, '8n');
                    
                    // Create multiple particles based on AQI level
                    const particleCount = Math.ceil(aqius / 50); // More particles for worse AQI
                    for (let i = 0; i < particleCount; i++) {
                        const x = p.random(p.width);
                        const y = p.random(p.height);
                        particles.push(new Particle(x, y, aqiLevel));
                    }
                    
                    currentNoteIndex = (currentNoteIndex + 1) % currentMelody.length;
                    if (currentNoteIndex === 0) {
                        currentMelodyIndex = (currentMelodyIndex + 1) % melodies.length;
                    }
                }
            };

            p.draw = () => {
                p.background(0, 25);

                // Check if it's time to play the next note
                if (isPlaying && p.millis() - lastNoteTime > noteInterval) {
                    playNote();
                    lastNoteTime = p.millis();
                }

                // Update and display particles
                for (let i = particles.length - 1; i >= 0; i--) {
                    particles[i].update();
                    particles[i].display();
                    if (particles[i].isDead()) {
                        particles.splice(i, 1);
                    }
                }
            };

            // Window resize handler
            p.windowResized = () => {
                p.resizeCanvas(window.innerWidth, window.innerHeight);
            };

            const updateAQI = async () => {
                try {
                    const response = await fetch(
                        `https://api.airvisual.com/v2/city?city=${currentCity}&state=&country=&key=${API_KEY}`
                    );
                    const data = await response.json();
                    aqius = data.data.current.pollution.aqius;
                    const aqiLevel = getAQILevel(aqius);
                    adjustSynthParameters(aqiLevel);
                } catch (error) {
                    console.error('Error fetching AQI:', error);
                }
            };

            // Update AQI every minute
            setInterval(updateAQI, 60000);
            updateAQI(); // Initial update
        });

        sketchRef.current = sketch;

        return () => {
            if (sketchRef.current) {
                sketchRef.current.remove();
            }
        };
    }, [currentCity, isPlaying]);

    const startAudio = async () => {
        try {
            await Tone.start();
            console.log('Audio is ready');
            setIsPlaying(!isPlaying);
        } catch (error) {
            console.error('Error starting audio:', error);
        }
    };

    return (
        <div className="relative w-full h-screen">
            <div ref={canvasRef} className="absolute inset-0" />
            <div className="absolute top-4 right-4 flex gap-2 z-10">
                <button
                    onClick={startAudio}
                    className={`px-4 py-2 rounded-lg ${
                        isPlaying ? 'bg-red-500' : 'bg-green-500'
                    } text-white mr-4`}
                >
                    {isPlaying ? 'Stop Audio' : 'Start Audio'}
                </button>
                <select
                    value={currentCity}
                    onChange={(e) => setCurrentCity(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-gray-700 text-white"
                >
                    <option value="HongKong">Hong Kong</option>
                    <option value="Bangkok">Bangkok</option>
                    <option value="Beijing">Beijing</option>
                    <option value="Melbourne">Melbourne</option>
                </select>
            </div>
        </div>
    );
};

export default AirMusicVisualizer;