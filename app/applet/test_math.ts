const doc = {
    lineItems: [
        { name: "casque", quantity: 8, days: 7, unitPrice: 150, vat: 20, calculationMode: "days" },
        { name: "test", quantity: 1, days: 2, unitPrice: 100, vat: 20 }
    ]
};

const isDays = true;
const getLineMultiplier = (item: any) => {
    const mode = item.calculationMode;
    if (mode === 'days') return (Number(item.days) || item.jours || item.jour || 1);
    
    if (isDays) return (Number(item.days) || item.jours || item.jour || 1);
    return 1;
};

doc.lineItems.forEach(item => {
    console.log("Item:", item.name);
    console.log("Multiplier:", getLineMultiplier(item));
    console.log("Total:", item.quantity * getLineMultiplier(item) * item.unitPrice);
});
