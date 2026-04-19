import random
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from matplotlib.patches import FancyBboxPatch

M = 101
servers = ["A", "B", "C", "D"]
REQUESTS_PER_FRAME = 40

def hash1(s):
    h = 0
    for c in s:
        h = (h * 31 + ord(c)) % M
    return h

def hash2(s):
    h = 1
    for c in s:
        h = (h * 17 + ord(c)) % (M - 1)
    return h + 1

def build_maglev(servers):
    n = len(servers)
    perm = []

    for s in servers:
        # Each server gets a full permutation of table slots using offset+skip.
        offset = hash1(s)
        skip = hash2(s)
        perm.append([(offset + j * skip) % M for j in range(M)])

    entry = [-1] * M
    next_idx = [0] * n
    filled = 0

    while filled < M:
        for i in range(n):
            c = perm[i][next_idx[i]]
            while entry[c] != -1:
                next_idx[i] += 1
                c = perm[i][next_idx[i]]
            # First free candidate for server i wins this round-robin step.
            entry[c] = i
            next_idx[i] += 1
            filled += 1
            if filled == M:
                break

    return entry

# Build lookup table
entry = build_maglev(servers)

# Load tracking
load = [0] * len(servers)

# Setup plot
fig, ax = plt.subplots()

# Fixed positions: one request source at left-center and servers on the right.
REQUEST_POS = (0.18, 0.5)
SERVER_X = 0.78
BOX_W = 0.22
REQUEST_BOX_H = 0.12
DOTS_PER_FRAME = 12
MAX_ACTIVE_DOTS = 500

# Active in-flight request dots.
in_flight_dots = []


def server_layout(num_servers):
    top = 0.88
    bottom = 0.12

    if num_servers <= 1:
        y_positions = [0.5]
        box_h = 0.14
    else:
        step = (top - bottom) / (num_servers - 1)
        y_positions = [top - i * step for i in range(num_servers)]
        box_h = max(0.045, min(0.12, step * 0.72))

    text_size = max(7, min(10, int(box_h * 95)))
    return y_positions, box_h, text_size


def draw_rounded_box(ax, center, width, height, color, text, text_size=10):
    x = center[0] - width / 2
    y = center[1] - height / 2
    box = FancyBboxPatch(
        (x, y),
        width,
        height,
        boxstyle="round,pad=0.02,rounding_size=0.03",
        linewidth=0,
        facecolor=color,
        zorder=3,
    )
    ax.add_patch(box)
    ax.text(
        center[0],
        center[1],
        text,
        ha="center",
        va="center",
        color="white",
        fontsize=text_size,
        fontweight="bold",
        zorder=4,
    )


def advance_and_draw_dots(ax, server_y):
    start_x = REQUEST_POS[0] + BOX_W / 2 - 0.005
    start_y = REQUEST_POS[1]
    end_x = SERVER_X - BOX_W / 2 + 0.005

    updated = []
    dot_x = []
    dot_y = []
    dot_size = []

    for dot in in_flight_dots:
        p = dot["progress"] + dot["speed"]
        if p >= 1.0:
            continue

        target_y = server_y[dot["server"]]
        x = start_x + (end_x - start_x) * p
        y = start_y + (target_y - start_y) * p + dot["jitter"]

        dot["progress"] = p
        updated.append(dot)
        dot_x.append(x)
        dot_y.append(y)
        dot_size.append(dot["size"])

    in_flight_dots[:] = updated[-MAX_ACTIVE_DOTS:]

    if dot_x:
        ax.scatter(dot_x, dot_y, s=dot_size, color="#F39C12", alpha=0.9, zorder=2)

def update(frame):
    # simulate incoming requests
    for _ in range(REQUESTS_PER_FRAME):
        req = "client_" + str(random.randint(0, 100000))
        h = hash1(req)
        server = entry[h]
        load[server] += 1

        if random.random() < (DOTS_PER_FRAME / REQUESTS_PER_FRAME):
            in_flight_dots.append(
                {
                    "server": server,
                    "progress": 0.0,
                    "speed": random.uniform(0.03, 0.08),
                    "jitter": random.uniform(-0.008, 0.008),
                    "size": random.uniform(12, 24),
                }
            )

    ax.clear()
    server_y, server_box_h, server_text_size = server_layout(len(servers))

    # Draw request source node as a large rounded square/box.
    draw_rounded_box(ax, REQUEST_POS, BOX_W, REQUEST_BOX_H, "#2E86DE", "Requests", text_size=11)

    # Draw server nodes, arrows, and user counts.
    for i, srv in enumerate(servers):
        y = server_y[i]

        ax.annotate(
            "",
            xy=(SERVER_X - BOX_W / 2 + 0.005, y),
            xytext=(REQUEST_POS[0] + BOX_W / 2 - 0.005, REQUEST_POS[1]),
            arrowprops={
                "arrowstyle": "->",
                "lw": 1.6,
                "color": "#6C757D",
                "alpha": 0.75,
                "shrinkA": 6,
                "shrinkB": 6,
            },
            zorder=1,
        )

        draw_rounded_box(
            ax,
            (SERVER_X, y),
            BOX_W,
            server_box_h,
            "#27AE60",
            f"Server {srv}\nUsers: {load[i]}",
            text_size=server_text_size,
        )

    # Draw moving request dots between request source and servers.
    advance_and_draw_dots(ax, server_y)

    total = sum(load)
    ax.set_title(
        f"Real-Time Maglev Request Flow | Total Users {total}",
        fontsize=16,
        fontweight="bold",
        
    )
    ax.set_xlim(0.0, 1.0)
    ax.set_ylim(0.0, 1.0)
    ax.axis("off")

ani = FuncAnimation(fig, update, interval=60)
plt.show()