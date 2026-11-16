"""Rebuild the local demo catalog on Windows with Python, Pillow, NumPy, SciPy and soundfile."""
from pathlib import Path

import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw
from scipy.ndimage import map_coordinates

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / "public/media"
RATE = 32000
TAU = 2 * np.pi
CATALOG = [
    ("afterglow", "落日余温", "Afterglow", "配乐诗", "#e78c52", 62, 82),
    ("tides", "潮汐来信", "Tidal Mail", "配乐诗", "#76b9b4", 60, 74),
    ("orbit", "远星回声", "Orbital Echo", "电子", "#a299d1", 57, 96),
    ("blue-hour", "蓝调末班车", "Blue Hour", "电子", "#799abe", 55, 88),
    ("moon", "月下留白", "Moonlit Pause", "轻音乐", "#c2c3b2", 65, 68),
    ("fields", "风穿过野地", "Open Fields", "轻音乐", "#a5b77e", 60, 86),
    ("beacon", "雾中灯塔", "Beacon", "氛围", "#c7898e", 58, 72),
    ("dawn", "向黎明去", "First Light", "氛围", "#edb894", 64, 80),
]
SIDE = 860
axis = np.linspace(0, 1, SIDE)
X, Y = np.meshgrid(axis, axis)


def smooth_noise(rng, cells):
    grid = rng.normal(size=(cells + 5, cells + 5))
    return map_coordinates(grid, [Y * cells + 2, X * cells + 2], order=3)


def color(value):
    return np.array(tuple(bytes.fromhex(value)), float)


def paint(img, mask, hue, strength=1):
    alpha = np.clip(mask * strength, 0, 1)[..., None]
    return img * (1 - alpha) + hue * alpha


def terrain(idx, rng):
    specs = [
        ("3a384e", "ffbf7c", "ffdc8d", "c68070", "271e33", .61, .39, .14),
        ("234650", "bad1c0", "e2d7a0", "5a9290", "173e49", .28, .37, .085),
        ("191b3b", "82788e", "c9aecb", "705d87", "19182d", .61, .43, .30),
        ("1d3047", "bc97a2", "d9bbaa", "697389", "172e43", .69, .43, .06),
        ("52686a", "e4d7b9", "f9edc9", "98a8a2", "324849", .39, .32, .19),
        ("496967", "dfd9aa", "f4e5bd", "a4ac80", "30493e", .73, .37, .11),
        ("633d52", "efb0a0", "fed5ab", "ae7883", "402f45", .31, .46, .14),
        ("64728b", "f5c1a0", "ffe5b6", "c79a90", "464355", .5, .37, .21),
    ]
    sky, horizon, sun, middle, near, cx, cy, radius = specs[idx]
    noise = smooth_noise(rng, 4) * .57 + smooth_noise(rng, 17) * .22 + smooth_noise(rng, 61) * .08
    depth = np.clip(Y / .81 + noise * .055, 0, 1)[..., None]
    img = color(sky) * (1 - depth) + color(horizon) * depth
    r = np.hypot(X - cx, Y - cy)
    img = paint(img, np.exp(-r / .16), color(sun), .42)
    disc = np.clip((radius - r) * SIDE, 0, 1)
    if idx == 2:
        globe = np.sqrt(np.clip(1 - (r / radius) ** 2, 0, 1))
        stripes = np.sin((Y + .2 * X + .06 * globe + .014 * noise) * 135) * .10
        shade = np.clip(.6 - .40*(X-cx)/radius - .25*(Y-cy)/radius + stripes, .1, 1.15)
        img = paint(img, disc, color(sun) * shade[..., None])
        rotation = -.31
        u = (X-cx)*np.cos(rotation)+(Y-cy)*np.sin(rotation)
        v = -(X-cx)*np.sin(rotation)+(Y-cy)*np.cos(rotation)
        ring = np.sqrt((u/.48)**2+(v/.071)**2)
        band = (ring > .84) & (ring < 1.07) & ((v > 0) | (disc < .1))
        img = paint(img, band * (.49 + .31*np.sin(ring*240)), color("f3d7c8"))
    else:
        img = paint(img, disc, color(sun) + 4 * noise[..., None])
    # Cloud veils stretch across the sky in thin horizontal sheets.
    cloud = map_coordinates(rng.normal(size=(60, 11)), [Y * 49 + 2 + noise*.4, X*7+2], order=3)
    img = paint(img, np.clip(cloud - .35,0,1)*np.exp(-((Y-.43)/.24)**2), color(horizon), .22)
    if idx in (2, 4):
        stars = (rng.random(Y.shape) < .00068) & (Y < .55) & (disc < .1)
        img = paint(img, stars, color("e7dfca"), .69)
    for layer in range(7):
        # Each ridge has a different silhouette, with smaller details following the slopes.
        base = .55 + layer * .058
        scale = .044 + layer * .004
        if idx in (1, 3, 6):
            scale *= .45
            base = .60 + layer*.054
        elif idx == 2:
            base += .13
        if idx == 0:
            base += .052 * np.cos(4*axis+.1*layer)
        if idx == 5:
            scale *= .72
        ridge = np.full(SIDE, base)
        for frequency, amplitude in [(1.2,1), (2.5,.53), (5,.25), (11,.12), (29,.047), (83,.019)]:
            ridge += np.sin(axis * TAU * frequency + rng.uniform(0,TAU)) * scale * amplitude
        height = Y - ridge
        light = np.clip(.52 + np.gradient(ridge,axis)[None,:]*.22,0,1)
        start = color(middle) * (1-layer/7) + color(near) * layer/7
        texture = noise*3 + 5*np.sin(2.1*np.sqrt(np.maximum(height,0))*88 + noise*1.2) * np.exp(-np.maximum(height,0)*9)
        surface = start + (texture + 8*light - 8*np.clip(height/.2,0,1))[...,None]
        img = paint(img, np.clip(height*SIDE,0,1), surface)
        if idx in (1,6) and layer == 3:
            water = Y > .74
            wave = np.sin(Y * 745 + noise * 8) * np.exp(-((X-cx)/.14)**2)
            img = paint(img,water,color(middle)+(wave*13+noise*3)[...,None])
    # Foreground details distinguish the coast, city, and rural prints.
    raster = Image.fromarray(np.uint8(np.clip(img,0,255)))
    draw = ImageDraw.Draw(raster)
    if idx == 3:
        for _ in range(32):
            x = rng.integers(0,SIDE)
            roof = int((.80 + rng.uniform(-.09,.08))*SIDE)
            w = rng.integers(8,41)
            draw.rectangle((x,roof,x+w,SIDE), fill=(31,45,60))
            for wy in range(roof+8,SIDE,13):
                for wx in range(x+3,x+w-2,8):
                    if rng.random() < .22:
                        draw.rectangle((wx,wy,wx+2,wy+3), fill=(180,149,121))
    if idx == 6:
        draw.polygon([(545,650),(550,588),(557,588),(563,650)],fill=(72,54,69))
        draw.rectangle((548,581,560,588),fill=(247,204,162))
        draw.polygon([(546,581),(554,575),(562,581)],fill=(69,52,66))
    img = np.array(raster, float)
    grain = rng.normal(0,2.7,Y.shape) + smooth_noise(rng,130)*1.7
    vignette = 1 - .13*((X-.5)**2 + (Y-.48)**2)
    return Image.fromarray(np.uint8(np.clip(img*vignette[...,None]+grain[...,None],0,255)))


def compose(idx, root_note, bpm):
    rng = np.random.default_rng(801+idx)
    beat = 60/bpm
    seconds = round(beat*64+3)
    music = np.zeros((seconds*RATE,2))
    def layer(start, samples, pan=.5):
        offset = round(start * RATE)
        n = min(len(samples),len(music)-offset)
        if n <= 0:
            return
        music[offset:offset+n] += samples[:n,None] * [np.sqrt(1-pan), np.sqrt(pan)]
    def tone(note,length,kind):
        t = np.arange(round(length*RATE))/RATE
        hz = 440*2**((note-69)/12)
        phase = TAU*hz*t
        if kind == "pad":
            envelope = (1-np.exp(-t/.43))*np.minimum(1,(length-t)/.75)
            return envelope*(np.sin(phase)+.40*np.sin(phase*1.0019)+.15*np.sin(2*phase))*.062
        if kind == "bass":
            return np.sin(phase)*(1-np.exp(-t/.025))*np.exp(-t/.68)*.18
        envelope = np.minimum(1,t/.012)*np.exp(-t/(.38+.07*(idx%4)))
        return envelope*(np.sin(phase)+.33*np.sin(phase*2.002)+.12*np.sin(phase*3.006))*.18
    chords = [[0,4,7,11],[-3,0,4,7],[-5,0,4,7],[-7,-3,0,4]]
    for bar in range(16):
        chord = chords[(bar + idx//2)%4]
        start = bar*4*beat
        for j,degree in enumerate(chord):
            layer(start,tone(root_note+degree,4*beat+.78,"pad"),.12+j*.25)
        layer(start,tone(root_note+chord[0]-12,2.4*beat,"bass"),.5)
        for j in range(4):
            at = start+(j+.5*(idx%2))*beat
            degree = chord[(bar//2+j+[0,1,3,2][idx%4])%4]
            pluck = tone(root_note+degree+12,1.8,"pluck") * .95
            layer(at,pluck,.32+.32*((bar+j)%2))
            layer(at+beat*.75,pluck*.22,.75)
            if idx in (2,3,5,7):
                t = np.arange(int(RATE*.25))/RATE
                if j%2 == 0:
                    kick = .17*np.sin(TAU*(48*t + 1.7*(1-np.exp(-t/.022))))*np.exp(-t/.063)
                    layer(at,kick,.5)
                hat = rng.normal(size=len(t))
                layer(at+beat/2,np.diff(hat,prepend=0)*np.exp(-t/.022)*.037,.63)
    fade = np.arange(len(music)) / RATE
    music *= np.minimum(1,fade/.22)[:,None] * np.clip((seconds-fade)/2,0,1)[:,None]
    music = np.tanh(music*1.55)
    return music*.87 / np.max(abs(music))


def main():
    MEDIA.mkdir(parents=True, exist_ok=True)
    for i,(sid,_,_,_,_,base,bpm) in enumerate(CATALOG):
        art = terrain(i,np.random.default_rng(i+441))
        art.save(MEDIA/f"{sid}.webp",quality=90,method=5)
        if i >= 2:
            audio = compose(i,base,bpm)
            sf.write(MEDIA/f"{sid}.mp3",audio,RATE,format="MP3",bitrate_mode="CONSTANT",compression_level=.68)

if __name__ == "__main__":
    main()
