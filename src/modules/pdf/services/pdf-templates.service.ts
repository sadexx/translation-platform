/* eslint-disable @typescript-eslint/no-magic-numbers */
import { Injectable } from "@nestjs/common";
import {
  IInterpreterBadge,
  IMembershipInvoice,
  IPayInReceipt,
  IPayOutReceipt,
  ITaxInvoiceReceipt,
} from "src/modules/pdf/common/interfaces";
import { Alignment, TDocumentDefinitions } from "pdfmake/interfaces";
import { LFH_LOGO_LABELLED, LFH_LOGO_LIGHT, RATING_STAR } from "src/modules/pdf/common/constants";
import { HelperService } from "src/modules/helper/services";

@Injectable()
export class PdfTemplatesService {
  constructor(private readonly helperService: HelperService) {}

  public payInReceiptTemplate(data: IPayInReceipt): TDocumentDefinitions {
    // TODO: remove after template rework

    // let discountTable: Content = "";
    // let discountTableHeader: Content = "";

    // if (data.isAppliedDiscountsExist) {
    //   discountTableHeader = {
    //     text: "Discount Applied (Memberships, Promocodes)",
    //     style: "subheader",
    //   };

    //   discountTable = {
    //     table: {
    //       headerRows: 1,
    //       widths: [121, 120, 121, 120],
    //       body: [
    //         [
    //           { text: "Discount Type", style: "tableHeader" },
    //           { text: "Promocode/Membership Type", style: "tableHeader" },
    //           { text: "Discount applied", style: "tableHeader" },
    //           { text: "Discount Amount", style: "tableHeader" },
    //         ],
    //       ],
    //     },
    //     margin: [0, 10, 0, 20],
    //   };

    //   if (
    //     data.promoCodeDiscountType &&
    //     data.promoCodePromoCodeOrMembershipType &&
    //     data.promoCodeDiscountApplied &&
    //     data.promoCodeDiscountAmount
    //   ) {
    //     discountTable.table.body.push([
    //       data.promoCodeDiscountType.toUpperCase(),
    //       data.promoCodePromoCodeOrMembershipType,
    //       data.promoCodeDiscountApplied,
    //       data.promoCodeDiscountAmount,
    //     ]);
    //   }

    //   if (
    //     data.membershipMinutesDiscountType &&
    //     data.membershipMinutesPromoCodeOrMembershipType &&
    //     data.membershipMinutesDiscountApplied &&
    //     data.membershipMinutesDiscountAmount
    //   ) {
    //     discountTable.table.body.push([
    //       data.membershipMinutesDiscountType.toUpperCase(),
    //       data.membershipMinutesPromoCodeOrMembershipType,
    //       data.membershipMinutesDiscountApplied,
    //       data.membershipMinutesDiscountAmount,
    //     ]);
    //   }

    //   if (
    //     data.membershipDiscountDiscountType &&
    //     data.membershipDiscountPromoCodeOrMembershipType &&
    //     data.membershipDiscountDiscountApplied &&
    //     data.membershipDiscountDiscountAmount
    //   ) {
    //     discountTable.table.body.push([
    //       data.membershipDiscountDiscountType.toUpperCase(),
    //       data.membershipDiscountPromoCodeOrMembershipType,
    //       data.membershipDiscountDiscountApplied,
    //       data.membershipDiscountDiscountAmount,
    //     ]);
    //   }
    // }

    const docDefinition: TDocumentDefinitions = {
      content: [
        {
          columns: [
            {
              text: [
                { text: "WE MAKE IT CLEAR/ ", style: "header" },
                { text: "INTERPRETING 24/7", style: ["header", "redText"] },
              ],
            },
            {
              image: LFH_LOGO_LIGHT,
              width: 60,
            },
          ],
        },
        {
          columns: [{ text: " ", style: { lineHeight: 2 } }],
        },
        {
          columns: [
            {
              image: LFH_LOGO_LABELLED,
              width: 100,
            },
            {
              alignment: "right",
              stack: [
                { text: `To ${data.userName}`, bold: true },
                { text: `(Client ID ${data.clientId})`, bold: true },
                { text: data.addressLine1 },
                { text: data.addressLine2 },
              ],
            },
          ],
          margin: [0, 10, 0, 20],
        },
        { text: "TAX INVOICE", style: "subheader" },
        { text: "ABN 42 661 208 635" },
        { text: `Invoice Number ${data.receiptNumber} - PAID`, style: "subheader", margin: [0, 10, 0, 10] },
        {
          table: {
            headerRows: 1,
            widths: [65, 65, 65, 65, 65, 65, 65],
            body: [
              [
                { text: "Currency", style: "tableHeader" },
                { text: "Date of Issue", style: "tableHeader" },
                { text: "Total", style: "tableHeader" },
                { text: "GST Amount", style: "tableHeader" },
                { text: "Invoice Total", style: "tableHeader" },
                { text: "Amount Paid", style: "tableHeader" },
                { text: "Amount Due", style: "tableHeader" },
              ],
              [
                data.currency,
                data.issueDate,
                data.total,
                data.gstAmount,
                data.invoiceTotal,
                data.amountPaid,
                data.amountDue,
              ],
            ],
          },
          margin: [0, 10, 0, 20],
        },
        { text: "Details", style: "subheader" },
        {
          table: {
            headerRows: 1,
            widths: [65, 85, 65, 85, 65, 45, 45],
            body: [
              [
                { text: "Booking ID", style: "tableHeader" },
                { text: "Service", style: "tableHeader" },
                { text: "Topic", style: "tableHeader" },
                { text: "Date & Time Of Service", style: "tableHeader" },
                { text: "Interpreter ID", style: "tableHeader" },
                { text: "Duration in Minutes", style: "tableHeader" },
                { text: "Total", style: "tableHeader" },
              ],
              [
                data.bookingId,
                data.service,
                data.topic,
                data.serviceDate,
                data.interpreterId,
                data.duration,
                data.invoiceTotal,
              ],
            ],
          },
          margin: [0, 10, 0, 20],
        },
        // TODO: remove after template rework
        // discountTableHeader,
        // discountTable,
        { text: "Payment", style: "subheader" },
        {
          table: {
            headerRows: 1,
            widths: [80, 242, 80, 80],
            body: [
              [
                { text: "Date", style: "tableHeader" },
                { text: "Description", style: "tableHeader" },
                { text: "Payment Total", style: "tableHeader" },
                { text: "This Invoice", style: "tableHeader" },
              ],
              [data.date, data.description, data.paymentTotal, data.thisInvoice],
            ],
          },
          margin: [0, 10, 0, 20],
        },
        {
          columns: [
            { text: "www.linguafrancahub.com", link: "http://www.linguafrancahub.com", color: "blue" },
            { text: "payments@lighuafrancahub.com", link: "mailto:payments@lighuafrancahub.com", color: "blue" },
            { text: "Lingua Franca Hub PTY LTD. @NSW, Australia, 2024" },
          ],
          style: "footer",
        },
      ],
      styles: {
        header: { fontSize: 14, bold: true },
        redText: { color: "red" },
        subheader: { fontSize: 12, bold: true, margin: [0, 10, 0, 10] },
        tableHeader: { bold: true, fontSize: 10, color: "black", fillColor: "#EFF9FE" },
        footer: { fontSize: 10, alignment: "center", margin: [0, 20, 0, 0] },
      },
      defaultStyle: {
        font: "Roboto",
      },
    };

    return docDefinition;
  }

  public payOutReceiptTemplate(data: IPayOutReceipt): TDocumentDefinitions {
    const docDefinition: TDocumentDefinitions = {
      content: [
        {
          columns: [
            {
              text: [
                { text: "WE MAKE IT CLEAR/ ", style: "header" },
                { text: "INTERPRETING 24/7", style: ["header", "redText"] },
              ],
            },
            {
              image: "logoLight",
              width: 60,
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          columns: [
            {
              image: "logoLabeled",
              width: 175,
            },
            {
              stack: [
                { text: "REMITTANCE ADVICE", fontSize: 25, bold: true, alignment: "right" },
                { text: `Invoice number ${data.receiptNumber}`, fontSize: 14, alignment: "right" },
                {
                  text: `${data.issueDate}`,
                  fontSize: 14,
                  margin: [0, 10, 0, 10],
                  alignment: "right",
                },
                { text: "From: LINGUA FRANCA HUB PTY LTD", fontSize: 14, bold: true, alignment: "right" },
                {
                  text: "36/1 Thread Lane, Waterloo, 2017, NSW, Australia",
                  fontSize: 14,
                  alignment: "right",
                },
              ],
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          stack: [
            {
              text: `To: ${data.userName}, Interpreter ID ${data.interpreterId}`,
              fontSize: 14,
              bold: true,
            },
            { text: `Hi, ${data.firstName},`, margin: [0, 10] },
            {
              text: `Here's your remittance advice for payment of ${data.currency} ${data.fullAmountWithoutCurrency}.`,
            },
            { text: "If you have any questions, please let us know.", margin: [0, 10] },
            { text: "Thank you,\nLingua Franca Hub Team", margin: [0, 10] },
          ],
        },

        {
          table: {
            headerRows: 1,
            widths: ["18%", "26%", "20%", "18%", "18%"],
            body: [
              [
                { text: "Payment Date", style: "tableHeader" },
                { text: "Booking ID", style: "tableHeader" },
                { text: "Booking Type", style: "tableHeader" },
                { text: "Chargeable Duration (mins)", style: "tableHeader" },
                { text: "Total Amount Paid In AUD", style: "tableHeader" },
              ],
              [`${data.paymentDate}`, `${data.bookingId}`, `${data.service}`, `${data.duration}`, `${data.fullAmount}`],
            ],
          },
          margin: [0, 10, 0, 0],
        },
        {
          table: {
            headerRows: 1,
            widths: ["18%", "26%", "20%", "18%", "18%"],
            body: [
              [
                { text: "Invoice Date", style: "tableHeader" },
                { text: "Booking Date & Time", style: "tableHeader" },
                { text: "Booking Topic", style: "tableHeader" },
                { text: "Invoice Total Excl GST in AUD", style: "tableHeader" },
                { text: "GST Charged in AUD", style: "tableHeader" },
              ],
              [`${data.paymentDate}`, `${data.serviceDate}`, `${data.topic}`, `${data.amount}`, `${data.gstAmount}`],
            ],
          },
          margin: [0, 10, 0, 20],
        },

        { text: "", margin: [0, 10] },

        {
          columns: [
            { text: "www.linguafrancahub.com", link: "http://www.linguafrancahub.com", color: "blue" },
            { text: "payments@lighuafrancahub.com", link: "mailto:payments@lighuafrancahub.com", color: "blue" },
            { text: "Lingua Franca Hub PTY LTD. @NSW, Australia, 2024" },
          ],
          style: "footer",
        },
      ],

      styles: {
        tableHeader: { bold: true, fontSize: 10, color: "black" },
        tableStyle: {
          margin: [0, 5, 0, 15],
          fontSize: 14,
        },
        redText: { color: "red" },
        footer: { fontSize: 10, alignment: "center", margin: [0, 20, 0, 0] },
      },
      defaultStyle: {
        font: "Roboto",
      },

      images: {
        logoLight: LFH_LOGO_LIGHT,
        logoLabeled: LFH_LOGO_LABELLED,
      },
    };

    return docDefinition;
  }

  public taxInvoiceTemplate(data: ITaxInvoiceReceipt): TDocumentDefinitions {
    const docDefinition: TDocumentDefinitions = {
      content: [
        {
          columns: [
            {
              text: [
                { text: "WE MAKE IT CLEAR/ ", style: "header" },
                { text: "INTERPRETING 24/7", style: ["header", "redText"] },
              ],
            },
            {
              image: "logoLight",
              width: 60,
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          columns: [
            {
              image: "logoLabeled",
              width: 150,
            },
            {
              alignment: "right",
              stack: [
                { text: "Recipient Created Tax Invoice", fontSize: 19, bold: true },
                { text: `Dated: ${data.invoiceDate}`, fontSize: 19, bold: true },
                { text: `Interpreter ID ${data.interpreterId}`, fontSize: 19, bold: true },
              ],
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          table: {
            widths: ["46%", "8%", "46%"],
            body: [
              [
                {
                  table: {
                    widths: ["50%", "50%"],
                    body: [
                      [{ text: "From Recipient" }, { text: `${data.companyName}` }],
                      [{ text: `Address` }, { text: `${data.companyAddress}` }],
                      [{ text: `Suburb/Town` }, { text: `${data.companySuburb}` }],
                      [{ text: `State/Territory` }, { text: `${data.companyState}` }],
                      [{ text: `Postcode` }, { text: `${data.companyPostcode}` }],
                      [{ text: `Australian Business Number (ABN)` }, { text: `${data.companyABN}` }],
                    ],
                  },
                  layout: {
                    heights: 50,
                  },
                },
                { text: " " },
                {
                  table: {
                    widths: ["50%", "50%"],
                    body: [
                      [{ text: "To Supplier" }, { text: `${data.supplierName}` }],
                      [{ text: `Address` }, { text: `${data.supplierAddress}` }],
                      [{ text: `Suburb/Town` }, { text: `${data.supplierSuburb}` }],
                      [{ text: `State/Territory` }, { text: `${data.supplierState}` }],
                      [{ text: `Postcode` }, { text: `${data.supplierPostcode}` }],
                      [{ text: `Australian Business Number (ABN)` }, { text: `${data.supplierABN}` }],
                    ],
                  },
                },
              ],
            ],
          },
          layout: "noBorders",
        },

        { text: "", margin: [0, 15] },

        {
          table: {
            headerRows: 1,
            widths: ["12%", "18%", "30%", "10%", "10%", "10%", "10%"],
            body: [
              [
                { text: "Booking ID", fontSize: 10 },
                { text: "Date and Time Supply", fontSize: 10 },
                { text: "Description of the Taxable Services", fontSize: 10 },
                { text: "Duration Charged (mins)", fontSize: 10 },
                { text: "Value Excl GST", fontSize: 10 },
                { text: "GST Amount", fontSize: 10 },
                { text: "Value Incl. GST", fontSize: 10 },
              ],
              [
                { text: data.bookingId, fontSize: 10 },
                { text: data.serviceDate, fontSize: 10 },
                { text: data.description, fontSize: 10 },
                { text: data.duration, fontSize: 10 },
                { text: data.valueExclGST, fontSize: 10 },
                { text: data.valueGST, fontSize: 10 },
                { text: data.total, fontSize: 10 },
              ],
            ],
          },
        },
        "\n\n",
        {
          text: "Written Agreement",
          bold: true,
          fontSize: 12,
        },
        {
          text: `The recipient and the supplier declare that this agreement relates to the above supplies. The recipient can issue tax invoices for these supplies. The supplier will not issue tax invoices for these supplies. The supplier acknowledges that it is registered for GST and that it will notify the recipient if it ceases to be registered. The recipient acknowledges that it is registered for GST and that it will notify the supplier if it ceases to be registered. Acceptance of this recipient-created tax invoice (RCTI) constitutes acceptance of the terms of this written agreement. Both parties to this supply agree that they are parties to an RCTI agreement. The supplier must notify the recipient within 21 days of receiving this document if the supplier does not wish to accept the proposed agreement.`,
          fontSize: 10,
        },
        "\n\n",
        {
          text: "This form is used for record-keeping purposes only and will not calculate totals for you.",
          bold: true,
          fontSize: 10,
        },

        {
          columns: [
            { text: "www.linguafrancahub.com", link: "http://www.linguafrancahub.com", color: "blue" },
            { text: "payments@lighuafrancahub.com", link: "mailto:payments@lighuafrancahub.com", color: "blue" },
            { text: "Lingua Franca Hub PTY LTD. @NSW, Australia, 2024" },
          ],
          style: "footer",
        },
      ],
      styles: {
        redText: { color: "red" },
        footer: { fontSize: 10, alignment: "center", margin: [0, 20, 0, 0] },
      },
      defaultStyle: {
        font: "Roboto",
      },
      images: {
        logoLight: LFH_LOGO_LIGHT,
        logoLabeled: LFH_LOGO_LABELLED,
      },
    };

    return docDefinition;
  }

  public membershipInvoiceTemplate(data: IMembershipInvoice, isUserFromAu: boolean): TDocumentDefinitions {
    const tablePricingDetailsRow = isUserFromAu
      ? [
          { text: "Membership Plan", fontSize: 10 },
          { text: "Value Excl GST", fontSize: 10 },
          { text: "GST Amount", fontSize: 10 },
          { text: "Value Incl. GST", fontSize: 10 },
        ]
      : [
          { text: "Membership Plan", fontSize: 10 },
          { text: "Invoice Total", fontSize: 10 },
        ];
    const tablePricingDetailsDataRow = isUserFromAu
      ? [
          { text: data.membershipType.charAt(0).toUpperCase() + data.membershipType.slice(1), fontSize: 10 },
          { text: data.valueExclGST, fontSize: 10 },
          { text: data.valueGST, fontSize: 10 },
          { text: data.total, fontSize: 10 },
        ]
      : [
          { text: data.membershipType.charAt(0).toUpperCase() + data.membershipType.slice(1), fontSize: 10 },
          { text: data.total, fontSize: 10 },
        ];
    const billToTableBody = [
      [{ text: "Bill To" }, { text: data.clientName }],
      [{ text: "Address" }, { text: data.clientAddress }],
      [{ text: "Suburb/Town" }, { text: data.clientSuburb }],
      [{ text: "State/Territory" }, { text: data.clientState }],
      [{ text: "Postcode" }, { text: data.clientPostcode }],
    ];
    const soldToTableBody = [
      [{ text: "Sold To" }, { text: data.clientName }],
      [{ text: "Address" }, { text: data.clientAddress }],
      [{ text: "Suburb/Town" }, { text: data.clientSuburb }],
      [{ text: "State/Territory" }, { text: data.clientState }],
      [{ text: "Postcode" }, { text: data.clientPostcode }],
    ];

    if (isUserFromAu && data.clientABN) {
      billToTableBody.push([{ text: "Australian Business Number (ABN)" }, { text: data.clientABN }]);
      soldToTableBody.push([{ text: "Australian Business Number (ABN)" }, { text: data.clientABN }]);
    }

    const docDefinition: TDocumentDefinitions = {
      content: [
        {
          columns: [
            {
              text: [
                { text: "WE MAKE IT CLEAR/ ", style: "header" },
                { text: "INTERPRETING 24/7", style: ["header", "redText"] },
              ],
            },
            {
              image: "logoLight",
              width: 60,
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          columns: [
            {
              image: "logoLabeled",
              width: 150,
            },
            {
              alignment: "right",
              stack: [
                { text: `Dated: ${data.invoiceDate}`, fontSize: 19, bold: true },
                { text: `Client ID ${data.clientId}`, fontSize: 19, bold: true },
              ],
            },
          ],
        },

        { text: "", margin: [0, 15] },

        {
          table: {
            widths: ["46%", "8%", "46%"],
            body: [
              [
                {
                  table: {
                    widths: ["50%", "50%"],
                    body: billToTableBody,
                  },
                  layout: {
                    heights: 50,
                  },
                },
                { text: " " },
                {
                  table: {
                    widths: ["50%", "50%"],
                    body: soldToTableBody,
                  },
                },
              ],
            ],
          },
          layout: "noBorders",
        },

        { text: "", margin: [0, 15] },

        {
          table: {
            headerRows: 1,
            widths: isUserFromAu ? ["12%", "18%", "30%", "10%", "10%", "10%", "10%"] : ["50%", "50%"],
            body: [tablePricingDetailsRow, tablePricingDetailsDataRow],
          },
        },
        {
          columns: [
            { text: "www.linguafrancahub.com", link: "http://www.linguafrancahub.com", color: "blue" },
            { text: "payments@lighuafrancahub.com", link: "mailto:payments@lighuafrancahub.com", color: "blue" },
            { text: "Lingua Franca Hub PTY LTD. @NSW, Australia, 2024" },
          ],
          style: "footer",
        },
      ],
      styles: {
        redText: { color: "red" },
        footer: { fontSize: 10, alignment: "center", margin: [0, 20, 0, 0] },
      },
      defaultStyle: {
        font: "Roboto",
      },
      images: {
        logoLight: LFH_LOGO_LIGHT,
        logoLabeled: LFH_LOGO_LABELLED,
      },
    };

    return docDefinition;
  }

  public async interpreterBadgeTemplate(data: IInterpreterBadge): Promise<TDocumentDefinitions> {
    const canvasYoffset = data.companyName ? 370 : 340;
    const docDefinition: TDocumentDefinitions = {
      content: [
        {
          image: LFH_LOGO_LIGHT,
          width: 100,
          alignment: "center",
          margin: [0, 20],
        },
        ...(data.companyName
          ? [
              {
                text: data.companyName ?? "",
                style: "roleName",
                alignment: "center" as Alignment,
                margin: [20, 0, 0, 10] as [number, number, number, number],
              },
            ]
          : []),
        {
          text: data.interpreterRole,
          style: "roleName",
          alignment: "center",
          margin: [20, 0, 0, 0],
        },
        {
          text: `${
            data.title ? `${data.title.charAt(0).toUpperCase()}${data.title.slice(1)}. ` : ""
          }${data.firstName} ${data.lastName}`,
          style: "interpreterName",
          alignment: "center",
          margin: [0, 20],
        },
        {
          text: `ID: ${data.platformId}`,
          style: "interpreterId",
          alignment: "center",
          margin: [5, 0, 0, 10],
        },
        {
          columns: [
            {
              width: 170,
              text: "",
            },
            {
              width: "auto",
              columns: [
                {
                  text: "Aggregate rating",
                  style: "ratingText",
                  margin: [0, 0, 5, 0],
                },
                {
                  image: RATING_STAR,
                  width: 20,
                  height: 20,
                  margin: [2, 0, 2, 0],
                },
                {
                  text: data.averageRating.toFixed(1),
                  style: "averageRating",
                  margin: [5, 0, 0, 0],
                },
              ],
              columnGap: 2,
            },
          ],
          margin: [0, 0, 0, 55],
        },
        {
          stack: [
            {
              image: await this.helperService.convertImageToBase64(data.avatar, data.userRoleId),
              width: 300,
              height: 300,
              alignment: "center",
              margin: [0, 0, 0, 0],
            },
            {
              canvas: [
                {
                  type: "ellipse",
                  x: 180,
                  y: 180,
                  r1: 180,
                  r2: 180,
                  lineWidth: 80,
                  lineColor: "white",
                },
              ],
              absolutePosition: { x: 115, y: canvasYoffset },
            },
            {
              stack: [
                {
                  canvas: [
                    {
                      type: "ellipse",
                      x: 65,
                      y: 65,
                      r1: 65,
                      r2: 65,
                      color: "#eff9fe",
                    },
                  ],
                  absolutePosition: { x: 367, y: canvasYoffset + 210 },
                },
                {
                  image: `data:image/png;base64,${data.interpreterBadge}`,
                  width: 100,
                  height: 100,
                  absolutePosition: { x: 387, y: canvasYoffset + 225 },
                },
              ],
            },
          ],
          margin: [0, 20],
        },
      ],
      styles: {
        roleName: {
          fontSize: 20,
          bold: true,
          color: "#03091D",
        },
        interpreterName: {
          fontSize: 30,
          bold: true,
          color: "#03091D",
        },
        interpreterId: {
          fontSize: 18,
          color: "#03091D",
        },
        ratingText: {
          fontSize: 18,
          color: "#03091D",
        },
        averageRating: {
          fontSize: 18,
          bold: true,
          color: "#03091D",
        },
      },
      defaultStyle: {
        font: "OpenSans",
      },
    };

    return docDefinition;
  }
}
