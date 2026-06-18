"""Time-based order-tracking simulation.

Status advances from `confirmed` to `delivered` based on minutes elapsed since
the order was placed, and the courier is interpolated along the route between
the restaurant and the delivery address. No background worker required — it's
all computed on read in the tracking endpoint.
"""

from django.utils import timezone

# (key, label, minute at which this stage *ends*)
SCHEDULE = [
    ("confirmed", "Order confirmed", 1),
    ("preparing", "Preparing your food", 4),
    ("picked_up", "Courier picked up", 5),
    ("on_the_way", "On the way", 12),
    ("delivered", "Delivered", None),  # terminal
]
STATUS_ORDER = [s[0] for s in SCHEDULE]
TERMINAL = {"delivered", "cancelled"}

# Courier travels between these minutes.
_PICKUP_MIN = 4
_DELIVER_MIN = 12


def elapsed_minutes(placed_at, now=None) -> float:
    now = now or timezone.now()
    return max(0.0, (now - placed_at).total_seconds() / 60.0)


def status_for(placed_at, stored_status, now=None) -> str:
    if stored_status in TERMINAL:
        return stored_status
    mins = elapsed_minutes(placed_at, now)
    for key, _label, end in SCHEDULE:
        if end is None or mins < end:
            return key
    return "delivered"


def eta_for(placed_at, stored_status, now=None) -> int:
    if status_for(placed_at, stored_status, now) == "delivered":
        return 0
    return max(0, round(_DELIVER_MIN - elapsed_minutes(placed_at, now)))


def courier_progress(placed_at, stored_status, now=None) -> float:
    if stored_status in TERMINAL:
        return 1.0 if stored_status == "delivered" else 0.0
    mins = elapsed_minutes(placed_at, now)
    if mins <= _PICKUP_MIN:
        return 0.0
    if mins >= _DELIVER_MIN:
        return 1.0
    return (mins - _PICKUP_MIN) / (_DELIVER_MIN - _PICKUP_MIN)


def interpolate(route, t: float):
    """Returns [lat, lng] at fraction t (0..1) along the polyline `route`."""
    if not route:
        return None
    if len(route) == 1 or t <= 0:
        return list(route[0])
    if t >= 1:
        return list(route[-1])

    seg_len = []
    total = 0.0
    for i in range(len(route) - 1):
        a, b = route[i], route[i + 1]
        d = ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5
        seg_len.append(d)
        total += d
    if total == 0:
        return list(route[0])

    target = t * total
    for i, d in enumerate(seg_len):
        if target <= d or i == len(seg_len) - 1:
            f = 0 if d == 0 else target / d
            a, b = route[i], route[i + 1]
            return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
        target -= d
    return list(route[-1])


def steps_for(current_status):
    idx = STATUS_ORDER.index(current_status) if current_status in STATUS_ORDER else 0
    return [
        {"key": key, "label": label, "done": i <= idx, "active": i == idx}
        for i, (key, label, _end) in enumerate(SCHEDULE)
    ]


def build_tracking(order, now=None):
    """Builds the `/orders/:id/tracking` payload for an order."""
    now = now or timezone.now()
    status = status_for(order.placed_at, order.status, now)
    eta = eta_for(order.placed_at, order.status, now)
    tracking = getattr(order, "tracking", None)
    route = tracking.route if tracking else []
    progress = courier_progress(order.placed_at, order.status, now)
    pos = interpolate(route, progress) if route else None

    # Prefer the assigned Courier (DB), fall back to the legacy snapshot fields.
    courier = None
    assigned = tracking.courier if tracking else None
    name = assigned.name if assigned else (tracking.courier_name if tracking else "")
    if name:
        courier = {
            "name": name,
            "avatar": assigned.avatar if assigned else tracking.courier_avatar,
            "phone": assigned.phone if assigned else tracking.courier_phone,
            "lat": pos[0] if pos else (route[0][0] if route else 0),
            "lng": pos[1] if pos else (route[0][1] if route else 0),
        }

    return {
        "orderId": order.id,
        "status": status,
        "etaMinutes": eta,
        "courier": courier,
        "route": route,
        "steps": steps_for(status),
    }
