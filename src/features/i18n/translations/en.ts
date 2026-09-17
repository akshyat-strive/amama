/**
 * English is the source dictionary. Every other locale is typed against
 * `TranslationShape` (leaves typed as plain `string`, not English's own
 * literal text) so a missing *key* is a build-time TypeScript error, without
 * forcing every other language to somehow type-check as English text.
 */
export type TranslationShape = {
  common: {
    continue: string
    /** "Continue with {count}" — the multi-select steps' button label. */
    continueWithCount: string
    skip: string
    goBack: string
  }
  language: {
    trigger: string
  }
  review: {
    pendingTitle: string
    pendingDescription: string
    changesTitle: string
    changesDescription: string
    notSubmittedTitle: string
    notSubmittedDescription: string
    submittedDocuments: string
    fixDocuments: string
    finishOnboarding: string
  }
  auth: {
    buyerTitle: string
    buyerDescription: string
    buyerOtherRole: string
    sellerTitle: string
    sellerDescription: string
    sellerOtherRole: string
    continueWith: string
    /** Takes `{provider}` — provider names (Google, Microsoft, Apple) stay
     *  as brand names in every locale. */
    continueWithProvider: string
    or: string
    emailLabel: string
    passwordLabel: string
    emailPlaceholder: string
    passwordPlaceholder: string
    showPassword: string
    hidePassword: string
    forgotLink: string
    signingIn: string
    logIn: string
    newToAmama: string
    getStarted: string
    backToLogin: string
    resetTitle: string
    resetDescription: string
    sendingLabel: string
    sendResetLink: string
    checkEmailTitle: string
    /** Takes `{email}`. */
    checkEmailDescription: string
  }
  onboarding: {
    country: {
      title: string
      description: string
      fieldLabel: string
      placeholder: string
      empty: string
    }
    account: {
      buyerTitle: string
      buyerDescription: string
      buyerNamePlaceholder: string
      buyerEmailPlaceholder: string
      sellerTitle: string
      sellerDescription: string
      sellerNamePlaceholder: string
      sellerEmailPlaceholder: string
      nameLabel: string
      emailLabel: string
      emailError: string
      settingUpAsLegend: string
      individual: string
      individualHint: string
      organization: string
      organizationHint: string
      youAreALegend: string
      producer: string
      producerHint: string
      trader: string
      traderHint: string
      termsNotice: string
    }
    birthday: {
      title: string
      /** Takes `{minAge}`. */
      description: string
      hint: string
    }
    company: {
      title: string
      description: string
      companyLabel: string
      companyPlaceholder: string
      licenceLabel: string
      licencePlaceholder: string
      businessTypeLegend: string
    }
    farm: {
      title: string
      description: string
      farmLabel: string
      farmPlaceholder: string
      regionLabel: string
      regionPlaceholder: string
      sellingAsLegend: string
      landLegend: string
    }
    sourcing: {
      title: string
      description: string
      /** Takes `{count}`. */
      selectedAnnouncement: string
    }
    produce: {
      title: string
      description: string
      /** Takes `{count}`. */
      selectedAnnouncement: string
    }
    volume: {
      title: string
      description: string
      annualVolumeLegend: string
      incotermLegend: string
    }
    certifications: {
      title: string
      description: string
    }
    documents: {
      title: string
      description: string
      dropHint: string
      /** Takes `{size}` — the accepted-types line under the drop hint. */
      upTo: string
      /** Takes `{file}` — an aria-label read while a file is uploading. */
      uploading: string
      replace: string
      remove: string
      enlarge: string
      requiredLabel: string
      /** Takes `{done}` and `{total}`. */
      requiredProgress: string
      /** Takes `{types}`. */
      wrongType: string
      /** Takes `{size}`. */
      tooLarge: string
    }
    done: {
      buyerTitle: string
      buyerDescription: string
      buyerStep1: string
      buyerStep2: string
      buyerStep3: string
      sellerTitle: string
      sellerDescription: string
      sellerStep1: string
      sellerStep2: string
      sellerStep3: string
      dashboardCta: string
    }
    options: {
      businessTypes: {
        importerDistributor: string
        foodManufacturer: string
        roasterProcessor: string
        wholesaler: string
        retailChain: string
        tradingHouse: string
      }
      producerTypes: {
        individualFarmer: string
        familyFarm: string
        cooperative: string
        producerAssociation: string
        estatePlantation: string
        aggregator: string
      }
      annualVolumes: {
        under20: string
        between20And100: string
        between100And500: string
        between500And2000: string
        over2000: string
      }
      incoterms: {
        fob: string
        cif: string
        cfr: string
        exw: string
        dap: string
        notSure: string
      }
      farmSizes: {
        under2Ha: string
        between2And10Ha: string
        between10And50Ha: string
        between50And200Ha: string
        over200Ha: string
      }
      crops: Record<
        | "coffee"
        | "cocoa"
        | "cashew"
        | "sesame"
        | "spices"
        | "tea"
        | "grains"
        | "pulses"
        | "apple"
        | "fresh-fruit"
        | "dried-fruit"
        | "vegetables"
        | "nuts"
        | "cotton"
        | "sugar"
        | "oils",
        string
      >
      certifications: Record<
        "organic" | "fairtrade" | "globalgap" | "rainforest" | "haccp" | "iso22000" | "halal" | "none",
        { label: string; hint: string }
      >
      documents: Record<
        | "governmentId"
        | "aadhaar"
        | "pan"
        | "gstin"
        | "tradeLicense"
        | "taxRegistration"
        | "iecCode"
        | "landProof"
        | "farmPhoto"
        | "fpoRegistration"
        | "fssai"
        | "importCustomsCode"
        | "bankDetails",
        { label: string; hint: string }
      >
    }
  }
}

const en: TranslationShape = {
  common: {
    continue: "Continue",
    continueWithCount: "Continue with {count}",
    skip: "Skip",
    goBack: "Go back",
  },
  language: {
    trigger: "Change language",
  },
  review: {
    pendingTitle: "We're checking your documents",
    pendingDescription:
      "A key account manager reviews every new account by hand. It usually takes a working day — we'll email you the moment it's done.",
    changesTitle: "One thing needs another look",
    changesDescription:
      "Your account is nearly there. Here's what your account manager sent back:",
    notSubmittedTitle: "Finish setting up first",
    notSubmittedDescription:
      "Your account isn't submitted for review yet. Complete onboarding and send your documents to get started.",
    submittedDocuments: "What you sent",
    fixDocuments: "Update my documents",
    finishOnboarding: "Finish onboarding",
  },
  auth: {
    buyerTitle: "Source direct from origin",
    buyerDescription:
      "Verified growers, transparent pricing, and shipment tracking from farm to port — one account, every trade.",
    buyerOtherRole: "Selling instead?",
    sellerTitle: "Reach buyers, skip the middlemen",
    sellerDescription:
      "List your harvest, talk to verified importers directly, and get paid on the terms you agree to.",
    sellerOtherRole: "Buying instead?",
    continueWith: "Continue with",
    continueWithProvider: "Continue with {provider}",
    or: "or",
    emailLabel: "Email",
    passwordLabel: "Password",
    emailPlaceholder: "user@domain.com",
    passwordPlaceholder: "••••••••",
    showPassword: "Show password",
    hidePassword: "Hide password",
    forgotLink: "Forgot email or password?",
    signingIn: "Signing in…",
    logIn: "Log in",
    newToAmama: "New to amama?",
    getStarted: "Get started",
    backToLogin: "Back to log in",
    resetTitle: "Reset your password",
    resetDescription:
      "Enter the email on your account and we'll send you a link to get back in.",
    sendingLabel: "Sending…",
    sendResetLink: "Send reset link",
    checkEmailTitle: "Check your email",
    checkEmailDescription:
      "If an account exists for {email}, we've sent a link to reset your password.",
  },
  onboarding: {
    country: {
      title: "Where are you based?",
      description:
        "This decides which fields and documents we'll ask for later, so we only ever ask for what your country actually needs.",
      fieldLabel: "Country",
      placeholder: "Search for a country",
      empty: "No countries found.",
    },
    account: {
      buyerTitle: "Let's set up your buying account",
      buyerDescription:
        "We'll use this to send quotes, shipping updates and contract documents.",
      buyerNamePlaceholder: "John Doe",
      buyerEmailPlaceholder: "john.doe@domain.com",
      sellerTitle: "Let's set up your seller account",
      sellerDescription:
        "We'll use this to send buyer enquiries and payment confirmations.",
      sellerNamePlaceholder: "Arjun Patel",
      sellerEmailPlaceholder: "arjun@greenfieldfarms.in",
      nameLabel: "Name",
      emailLabel: "Email",
      emailError: "That email doesn't look right yet.",
      settingUpAsLegend: "Setting this up as",
      individual: "An individual",
      individualHint: "You, trading under your own name",
      organization: "A business or organisation",
      organizationHint: "Company, cooperative, or trading entity",
      youAreALegend: "You are a",
      producer: "Producer",
      producerHint: "You grow or raise what you sell",
      trader: "Trader",
      traderHint: "You buy from producers and resell",
      termsNotice: "By continuing you agree to amama's Terms and Privacy Policy.",
    },
    birthday: {
      title: "When were you born?",
      description:
        "Cross-border trade accounts are {minAge}+. We only ever show your age bracket, never the date.",
      hint: "Spin the wheels, or focus one and use the arrow keys.",
    },
    company: {
      title: "Tell us about your business",
      description:
        "Growers see this before they accept an enquiry — it's how trust starts.",
      companyLabel: "Company",
      companyPlaceholder: "Northwind Foods Ltd",
      licenceLabel: "Licence",
      licencePlaceholder: "Add it now or later",
      businessTypeLegend: "What kind of business is it?",
    },
    farm: {
      title: "Tell us about your farm",
      description:
        "Buyers see origin details first. The fuller this is, the more enquiries you get.",
      farmLabel: "Farm",
      farmPlaceholder: "Krishna Valley Farmers Cooperative",
      regionLabel: "Region",
      regionPlaceholder: "Nashik, Maharashtra",
      sellingAsLegend: "Who are you selling as?",
      landLegend: "Land under cultivation",
    },
    sourcing: {
      title: "What do you want to source?",
      description:
        "Pick as many as you like — you can always add more later. We'll match you with growers who have them ready this season.",
      selectedAnnouncement: "{count} selected",
    },
    produce: {
      title: "What do you grow?",
      description: "Pick everything you harvest — or skip and add it once you're in.",
      selectedAnnouncement: "{count} crops selected",
    },
    volume: {
      title: "How do you like to trade?",
      description:
        "This shapes the quotes you get. Nothing here is binding — you can change it per order.",
      annualVolumeLegend: "Expected annual volume",
      incotermLegend: "Preferred incoterm",
    },
    certifications: {
      title: "Any certifications?",
      description:
        "Certified lots earn better prices. No certificates yet? Skip this — we'll show you the route to one.",
    },
    documents: {
      title: "Documents you'll need",
      description:
        "This is based on where you're trading from and how you're set up — you don't need any of this now, just a heads-up on what to have ready.",
      dropHint: "Drag & drop, or click to browse",
      upTo: "up to {size}",
      uploading: "Uploading {file}…",
      replace: "Replace file",
      remove: "Remove file",
      enlarge: "View larger",
      requiredLabel: "required",
      requiredProgress: "{done} of {total} required documents added",
      wrongType: "That file type isn't supported. Use {types}.",
      tooLarge: "That file is over {size}. Try a smaller one.",
    },
    done: {
      buyerTitle: "You're in",
      buyerDescription:
        "We're matching your sourcing list against growers with stock this season.",
      buyerStep1: "Browse verified lots at origin",
      buyerStep2: "Request samples and quotes",
      buyerStep3: "Complete KYC before your first contract",
      sellerTitle: "You're in",
      sellerDescription:
        "Your farm profile is live. Buyers searching your crops can find you now.",
      sellerStep1: "Add your first harvest listing",
      sellerStep2: "Upload certificates and land documents",
      sellerStep3: "Set the payment terms you accept",
      dashboardCta: "Go to my dashboard",
    },
    options: {
      businessTypes: {
        importerDistributor: "Importer / distributor",
        foodManufacturer: "Food manufacturer",
        roasterProcessor: "Roaster / processor",
        wholesaler: "Wholesaler",
        retailChain: "Retail chain",
        tradingHouse: "Trading house",
      },
      producerTypes: {
        individualFarmer: "Individual farmer",
        familyFarm: "Family farm",
        cooperative: "Cooperative",
        producerAssociation: "Producer association",
        estatePlantation: "Estate / plantation",
        aggregator: "Aggregator",
      },
      annualVolumes: {
        under20: "Under 20 MT",
        between20And100: "20 – 100 MT",
        between100And500: "100 – 500 MT",
        between500And2000: "500 – 2,000 MT",
        over2000: "Over 2,000 MT",
      },
      incoterms: {
        fob: "FOB",
        cif: "CIF",
        cfr: "CFR",
        exw: "EXW",
        dap: "DAP",
        notSure: "Not sure yet",
      },
      farmSizes: {
        under2Ha: "Under 2 hectares",
        between2And10Ha: "2 – 10 hectares",
        between10And50Ha: "10 – 50 hectares",
        between50And200Ha: "50 – 200 hectares",
        over200Ha: "Over 200 hectares",
      },
      crops: {
        coffee: "Coffee",
        cocoa: "Cocoa",
        cashew: "Cashew",
        sesame: "Sesame",
        spices: "Spices",
        tea: "Tea",
        grains: "Grains & cereals",
        pulses: "Pulses & legumes",
        apple: "Apple",
        "fresh-fruit": "Fresh fruit",
        "dried-fruit": "Dried fruit",
        vegetables: "Vegetables",
        nuts: "Tree nuts",
        cotton: "Cotton & fibre",
        sugar: "Sugar & sweeteners",
        oils: "Edible oils",
      },
      certifications: {
        organic: { label: "Organic", hint: "EU / USDA / NOP" },
        fairtrade: { label: "Fairtrade", hint: "FLO-CERT" },
        globalgap: { label: "GlobalG.A.P.", hint: "Farm assurance" },
        rainforest: { label: "Rainforest Alliance", hint: "Sustainability" },
        haccp: { label: "HACCP", hint: "Food safety" },
        iso22000: { label: "ISO 22000", hint: "Food safety mgmt" },
        halal: { label: "Halal", hint: "Export markets" },
        none: { label: "None yet", hint: "We can help you get certified" },
      },
      documents: {
        governmentId: { label: "Government-issued ID", hint: "Passport or national ID" },
        aadhaar: { label: "Aadhaar", hint: "12-digit unique ID number" },
        pan: { label: "PAN", hint: "Income tax ID" },
        gstin: { label: "GSTIN", hint: "GST registration number" },
        tradeLicense: { label: "Trade licence", hint: "Local business registration" },
        taxRegistration: { label: "Tax registration", hint: "VAT / GST certificate" },
        iecCode: { label: "Import-Export Code (IEC)", hint: "Required for cross-border trade" },
        landProof: { label: "Land ownership / lease proof", hint: "Title deed or lease agreement" },
        farmPhoto: { label: "Geo-tagged farm photo", hint: "Shows your farm's GPS location" },
        fpoRegistration: {
          label: "FPO / cooperative registration",
          hint: "For producer organisations",
        },
        fssai: { label: "FSSAI licence", hint: "Food safety registration" },
        importCustomsCode: { label: "Import customs code", hint: "For cross-border purchases" },
        bankDetails: { label: "Bank account details", hint: "For payments" },
      },
    },
  },
}

export default en
