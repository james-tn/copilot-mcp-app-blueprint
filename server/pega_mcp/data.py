"""In-memory demo dataset for the Pega Customer Engagement Blueprint.

Ported from the Custom Engine Agent fixtures (agent/src/pega/store.ts) so the two
POCs share the same illustrative data (blueprint CDHBP-335041). Swap this module
for real Pega MCP calls to go live.
"""

from __future__ import annotations

import itertools
from typing import Any
from urllib.parse import quote

OUTCOMES = [
    "Acquire", "Grow", "Nurture", "Onboard",
    "Resilience & Collections", "Retain", "Service",
]
CHANNELS = [
    "Agent Assisted", "Call Center", "Email", "IVR", "Mobile",
    "Paid Media", "Push Notifications", "SMS", "Web",
]
FEATURES = ["Customer Journeys", "Data Model"]

PHASES = ["context", "setup", "personas", "brand", "experiences", "summary"]

_counter = itertools.count(1000)


def _id(prefix: str) -> str:
    return f"{prefix}-{next(_counter)}"


def img(seed: str, w: int = 600, h: int = 300) -> str:
    """Deterministic placeholder image so the widget renders without auth-gated assets."""
    return f"https://picsum.photos/seed/{quote(seed)}/{w}/{h}"


def _seed_personas() -> list[dict[str, Any]]:
    return [
        {
            "id": "chloe", "name": "Connected Chloe", "gender": "Female",
            "ageBand": "Career Builders", "imageUrl": img("chloe", 160, 160),
            "description": (
                "Late 30s, balancing a full-time job, a partner, and school-age kids while "
                "managing most of the household's tech decisions. Frustrated by juggling too "
                "many bills, limited storage, and family members on mismatched plans. Looking "
                "for simpler bundling, stronger security, and better value. Responds best to "
                "practical messaging about convenience, family protection, and clear monthly value."
            ),
        },
        {
            "id": "ulysses", "name": "Upgrading Ulysses", "gender": "Male",
            "ageBand": "Established", "imageUrl": img("ulysses", 160, 160),
            "description": (
                "Mid-40s, runs a small business or side hustle and relies heavily on his phone, "
                "laptop, and collaboration tools. Frustrated by outdated devices, storage limits, "
                "and tools that don't work together. Looking for premium upgrades that save time "
                "and improve reliability. Trusts brands that lead with performance, productivity "
                "gains, and transparent upgrade economics."
            ),
        },
        {
            "id": "aaliyah", "name": "Aspirational Aaliyah", "gender": "Female",
            "ageBand": "Career Builders", "imageUrl": img("aaliyah", 160, 160),
            "description": (
                "Late 20s, building her career and social life, using her phone as the center of "
                "work, entertainment, shopping, and organization. Frustrated by feeling capped by "
                "her current plan and running out of cloud space. Shops mobile-first, influenced by "
                "social proof and creator recommendations, responds to modern, benefit-led messaging "
                "that makes premium feel accessible."
            ),
        },
        {
            "id": "carlos", "name": "Cautious Carlos", "gender": "Male",
            "ageBand": "Established", "imageUrl": img("carlos", 160, 160),
            "description": (
                "Early 50s, loyal customer for years with a steady middle-income household, mainly "
                "wants services to work without surprises. Frustrated by confusing add-ons and "
                "unclear pricing. Looking for selective upgrades that protect devices and simplify "
                "communication. Trusts brands that use plain language and explain exactly why an "
                "upgrade is relevant."
            ),
        },
        {
            "id": "indigo", "name": "Independent Indigo", "gender": "Non-binary",
            "ageBand": "Gen Z / Students", "imageUrl": img("indigo", 160, 160),
            "description": (
                "Early 20s, in college or first job, budget-conscious with strong reliance on mobile "
                "connectivity and entertainment subscriptions. Frustrated by fragmented services and "
                "aging hardware. Looking for flexible upgrades, device financing, and add-ons with "
                "visible everyday utility. Responds best to messaging about affordability and monthly "
                "flexibility."
            ),
        },
    ]


def _seed_voice() -> list[dict[str, Any]]:
    return [
        {"id": "value-led", "name": "Value-Led", "enabled": True,
         "description": "Lead with the benefit, then the recommendation."},
        {"id": "plainspoken", "name": "Plainspoken Precision", "enabled": True,
         "description": "Clear, specific, easy to act on. Plain words, concrete numbers."},
        {"id": "life-aware", "name": "Life-Aware", "enabled": True,
         "description": "Tie every offer to a real-life moment."},
        {"id": "guided-confidence", "name": "Guided Confidence", "enabled": True,
         "description": "Recommend the next best step with a reason. Never aggressive."},
    ]


def _t(name: str, channel: str, headline: str, body: str, cta: str, seed: str,
       principle: str = "Value framing") -> dict[str, Any]:
    return {
        "id": _id("t"), "name": name, "channel": channel, "headline": headline,
        "body": body, "cta": cta, "imageUrl": img(seed), "marketingPrinciple": principle,
    }


def _seed_actions() -> list[dict[str, Any]]:
    return [
        {
            "id": "surface-pro-accessory-bundle", "name": "Surface Pro Accessory Bundle",
            "product": "Device Purchase", "objective": "Grow",
            "description": (
                "Targets existing Surface Pro owners who use their device for work, school, or "
                "multitasking. Offers a Surface Pro accessory attach with Surface Pro Keyboard and "
                "Surface Slim Pen to turn their current device into a more complete work-anywhere setup."
            ),
            "treatments": [
                _t("Pro Setup Upgrade", "Mobile", "Complete your Surface Pro",
                   "Add Surface Pro Keyboard and Surface Slim Pen to unlock a more productive, flexible setup wherever your day takes you.",
                   "Shop Pro Bundle", "surfacepro1"),
                _t("Surface Pro Boost", "Mobile", "Built for Surface Pro",
                   "Get the accessories designed to match your Surface Pro — keyboard, pen, and more, ready to go.",
                   "Upgrade Pro Today", "surfacepro2"),
            ],
        },
        {
            "id": "surface-laptop-premium-upgrade", "name": "Surface Laptop Premium Upgrade",
            "product": "Device Purchase", "objective": "Grow",
            "description": (
                "Encourages customers with aging laptops to step up to a premium Surface Laptop with "
                "better performance, battery life, and display for demanding work."
            ),
            "treatments": [
                _t("Power Through Your Day", "Mobile", "More power, less waiting",
                   "Step up to a premium Surface Laptop built for all-day battery and effortless multitasking.",
                   "Explore Laptops", "surfacelaptop1"),
                _t("Premium Performance", "Mobile", "Your best work, faster",
                   "Upgrade to a Surface Laptop that keeps up with everything you do — at work and at home.",
                   "See Upgrade Offers", "surfacelaptop2"),
            ],
        },
        {
            "id": "m365-family-upgrade", "name": "Microsoft 365 Family Upgrade",
            "product": "Mobile Plans", "objective": "Grow",
            "description": (
                "Targets households on mismatched plans. Offers a Microsoft 365 Family plan with more "
                "cloud storage, security, and shared benefits across family members."
            ),
            "treatments": [
                _t("One Plan for the Whole Family", "Mobile", "Bring the family together",
                   "Share premium apps, 1 TB of storage each, and advanced security across up to 6 people — one simple plan.",
                   "Upgrade to Family", "m365family1"),
                _t("Family Value", "Mobile", "More for everyone, less to manage",
                   "Consolidate your household onto Microsoft 365 Family and save versus separate plans.",
                   "See Family Plan", "m365family2"),
            ],
        },
        {
            "id": "m365-personal-plus", "name": "Microsoft 365 Personal Plus",
            "product": "Mobile Plans", "objective": "Grow",
            "description": (
                "For individuals running low on storage or wanting premium features. Offers more cloud "
                "storage and advanced security on a personal plan."
            ),
            "treatments": [
                _t("Never Run Out of Space", "Mobile", "Room for everything",
                   "Get 1 TB of secure cloud storage plus premium apps — perfect for work, photos, and everything in between.",
                   "Go Personal Plus", "m365personal1"),
                _t("Premium, Just for You", "Mobile", "Upgrade your everyday",
                   "Unlock advanced security and more storage with Microsoft 365 Personal — built around how you work.",
                   "Upgrade Now", "m365personal2"),
            ],
        },
        {
            "id": "value-added-security", "name": "Value-Added Security Pack",
            "product": "Value-Added Services", "objective": "Grow",
            "description": (
                "Targets security-conscious customers. Offers an add-on bundle of identity protection, "
                "device security, and family safety features."
            ),
            "treatments": [
                _t("Protect What Matters", "Mobile", "Security that travels with you",
                   "Add identity protection and device security to keep your family safe online — for less than you'd expect.",
                   "Add Protection", "security1"),
                _t("Peace of Mind Bundle", "Mobile", "Stay safe, stay simple",
                   "One add-on covers identity, device, and family safety — clear value, no hidden catches.",
                   "Add Security Pack", "security2"),
            ],
        },
    ]


def make_seed_blueprint() -> dict[str, Any]:
    return {
        "id": "CDHBP-335041",
        "title": "Increase ARPU/ARPA / Maximize customer lifetime value",
        "industry": "Communications",
        # Context
        "orgName": "Microsoft",
        "website": "microsoft.com",
        "objective": "Increase ARPU/ARPA / Maximize customer lifetime value",
        "objectiveDetails": (
            "Maximize revenue potential from the existing customer base by identifying expansion "
            "opportunities and preventing value leakage. Cross-sell and upsell premium services, device "
            "upgrades, add-on features, and service tier migrations. Target 25-35% increase in ARPU "
            "while keeping CSAT above 8.5."
        ),
        "language": "English",
        "location": "United States",
        # Setup
        "products": ["Mobile Plans", "Device Purchase", "Value-Added Services"],
        "outcomes": ["Grow"],
        "channels": ["Mobile"],
        "features": [],
        # Personas / Brand / Experiences
        "personas": _seed_personas(),
        "voice": _seed_voice(),
        "logoUrl": None,
        "headerColor": "#f25022",
        "backgroundColor": "#000000",
        "footerColor": "#000000",
        "actions": _seed_actions(),
    }


# Re-exported so the store can lazily (re)seed generated sections.
seed_personas = _seed_personas
seed_voice = _seed_voice
seed_actions = _seed_actions
new_id = _id
