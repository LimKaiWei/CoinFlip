// extension.js
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import St from 'gi://St';

const CoinFlipButton = GObject.registerClass(
class CoinFlipButton extends PanelMenu.Button {
    _init() {
        super._init(0.0, 'Coin Flip', true);

        this._isAnimating = false;
        this._face = Math.random() < 0.5 ? 'heads' : 'tails';

        // Wrapper uses BinLayout to allow shadow and coin to stack independently
        this._wrapper = new St.Widget({
            layout_manager: new Clutter.BinLayout(),
            x_expand: true,
            y_expand: true,
        });
        this._wrapper.add_style_class_name('coinflip-container');

        // Independent shadow stays on the ground layer
        this._shadow = new St.Widget({
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.END,
        });
        this._shadow.add_style_class_name('coinflip-shadow');
        this._shadow.set_pivot_point(0.5, 0.5);

        // Coin uses BinLayout to center the text label perfectly
        this._coin = new St.Widget({
            layout_manager: new Clutter.BinLayout(),
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
            reactive: false
        });
        this._coin.add_style_class_name('coinflip-coin');
        this._coin.add_style_class_name('coinflip-' + this._face);
        this._coin.set_pivot_point(0.5, 0.5);

        this._faceLabel = new St.Label({
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._faceLabel.add_style_class_name('coinflip-face');
        this._faceLabel.set_text(this._face === 'heads' ? 'H' : 'T');

        this._coin.add_child(this._faceLabel);

        this._wrapper.add_child(this._shadow);
        this._wrapper.add_child(this._coin);
        this.add_child(this._wrapper);

        this.connect('button-press-event', () => {
            this.flip();
            return Clutter.EVENT_STOP;
        });
    }

    _setFace(face) {
        this._coin.remove_style_class_name('coinflip-heads');
        this._coin.remove_style_class_name('coinflip-tails');
        this._coin.add_style_class_name('coinflip-' + face);
        this._faceLabel.set_text(face === 'heads' ? 'H' : 'T');
    }

    flip() {
        if (this._isAnimating)
            return;

        this._isAnimating = true;

        // True randomness!
        const nextFace = Math.random() < 0.5 ? 'heads' : 'tails';
        
        // Multi-spin logic
        const numSpins = 6; // Half-spins for the animation
        
        const totalDuration = 700; // ms
        const upDuration = totalDuration * 0.45;
        const downDuration = totalDuration * 0.55;
        const spinDuration = totalDuration / numSpins;
        const jumpHeight = -40; // Pixels to jump up

        // 1. Animate Shadow: Shrink and fade as coin rises
        this._shadow.ease({
            scale_x: 0.6,
            scale_y: 0.6,
            opacity: 100,
            duration: upDuration,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                // Grow and darken as coin falls
                this._shadow.ease({
                    scale_x: 1.0,
                    scale_y: 1.0,
                    opacity: 255,
                    duration: downDuration,
                    mode: Clutter.AnimationMode.EASE_IN_QUAD,
                });
            }
        });

        // 2. Vertical Gravity: Jump up, then fall down
        this._coin.ease({
            translation_y: jumpHeight,
            duration: upDuration,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                this._coin.ease({
                    translation_y: 0,
                    duration: downDuration,
                    mode: Clutter.AnimationMode.EASE_IN_QUAD,
                });
            }
        });

        // 3. Horizontal Spinning Effect
        let currentFace = this._face;
        let spinsDone = 0;

        const spinStep = () => {
            this._coin.ease({
                scale_x: 0, // Turn invisible edge-on
                duration: spinDuration / 2,
                mode: Clutter.AnimationMode.LINEAR,
                onComplete: () => {
                    // Switch face while it's invisible
                    currentFace = currentFace === 'heads' ? 'tails' : 'heads';
                    
                    // If this is the final spin-out, force it to the real outcome
                    if (spinsDone === numSpins - 1) {
                        currentFace = nextFace;
                    }
                    this._setFace(currentFace);

                    // Expand back out
                    this._coin.ease({
                        scale_x: 1,
                        duration: spinDuration / 2,
                        mode: Clutter.AnimationMode.LINEAR,
                        onComplete: () => {
                            spinsDone++;
                            if (spinsDone < numSpins) {
                                spinStep();
                            } else {
                                this._isAnimating = false;
                                this._face = nextFace; // Update canonical state
                            }
                        }
                    });
                }
            });
        };

        spinStep();
    }
});

export default class PlainExampleExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._button = null;
    }

    enable() {
        console.log(`[CoinFlip] Extension enabled!`);
        this._button = new CoinFlipButton();
        Main.panel.addToStatusArea('coinflip', this._button);
    }

    disable() {
        console.log(`[CoinFlip] Extension disabled!`);
        this._button?.destroy();
        this._button = null;
    }
}