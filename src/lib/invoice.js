import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateInvoice = (cartItems, total, discount, customerName) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("SHOP INVOICE", 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 30);
    doc.text(`Time: ${new Date().toLocaleTimeString()}`, 15, 36);
    doc.text(`Customer: ${customerName || 'Walk-in Customer'}`, 15, 42);

    // Table Data
    const tableColumn = ["Item", "Price", "Qty", "Total"];
    const tableRows = [];

    cartItems.forEach(item => {
        const itemData = [
            item.name,
            `Rs. ${item.price.toFixed(2)}`,
            item.quantity,
            `Rs. ${(item.price * item.quantity).toFixed(2)}`
        ];
        tableRows.push(itemData);
    });

    // Generate Table
    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 50,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [79, 70, 229] } // Indigo color
    });

    // Totals
    const finalY = doc.lastAutoTable.finalY + 10;

    doc.text(`Subtotal: Rs. ${(total + discount).toFixed(2)}`, 140, finalY);
    doc.text(`Discount: -Rs. ${discount.toFixed(2)}`, 140, finalY + 6);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`Grand Total: Rs. ${total.toFixed(2)}`, 140, finalY + 14);

    // Footer
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text("Thank you for your business!", 105, finalY + 30, { align: "center" });

    // Save
    doc.save(`invoice_${Date.now()}.pdf`);
};
