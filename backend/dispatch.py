"""
dispatch.py

Dispatch decision layer for the microgrid: given current generation and
load, decides how much comes from renewables, battery, and diesel, and
how the battery's state of charge changes as a result.
"""


def dispatch_energy(consumption, solar, wind, battery_charge, battery_capacity, is_calamity=False):
    """
    Dispatch decision for a microgrid with solar, wind, diesel, and battery.

    Normal mode priority: solar+wind -> battery -> diesel (diesel assumed always sufficient)
    Calamity mode priority: solar+wind -> battery charging is the goal; diesel covers
                             consumption; any renewable left after battery is full
                             still offsets consumption before diesel does.

    Parameters:
        consumption (float): required load (kW)
        solar (float): solar production (kW)
        wind (float): wind production (kW)
        battery_charge (float): current battery charge level (kWh)
        battery_capacity (float): max battery capacity (kWh)
        is_calamity (bool): True if in storm-prep mode

    Returns:
        dict with renewable_used, battery_used, battery_charged,
        diesel_used, curtailed, new_battery_charge
    """
    renewable_total = solar + wind
    room = battery_capacity - battery_charge

    result = {
        "renewable_used": 0.0,
        "battery_used": 0.0,
        "battery_charged": 0.0,
        "diesel_used": 0.0,
        "curtailed": 0.0,
        "new_battery_charge": battery_charge,
    }

    if not is_calamity:
        if renewable_total >= consumption:
            # Renewables fully cover load; excess charges battery (capped), rest curtailed
            excess = renewable_total - consumption
            charged = min(excess, room)
            result.update(
                renewable_used=consumption,
                battery_charged=charged,
                curtailed=excess - charged,
                new_battery_charge=battery_charge + charged,
            )
        else:
            # Renewables fall short; battery covers the gap; diesel covers the rest
            deficit = consumption - renewable_total
            drawn = min(deficit, battery_charge)
            result.update(
                renewable_used=renewable_total,
                battery_used=drawn,
                diesel_used=deficit - drawn,
                new_battery_charge=battery_charge - drawn,
            )
    else:
        # Calamity: renewables prioritize charging the battery first
        charged = min(renewable_total, room)
        leftover_renewable = renewable_total - charged
        renewable_to_consumption = min(leftover_renewable, consumption)
        result.update(
            battery_charged=charged,
            new_battery_charge=battery_charge + charged,
            renewable_used=renewable_to_consumption,
            diesel_used=consumption - renewable_to_consumption,
            curtailed=leftover_renewable - renewable_to_consumption,
        )

    return result
