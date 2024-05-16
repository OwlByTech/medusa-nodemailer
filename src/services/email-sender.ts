import { AbstractNotificationService, Cart, CartService, Order, OrderService } from "@medusajs/medusa"
import { EntityManager } from "typeorm"
import nodemailer from 'nodemailer';
import nodemailerMjmlPlugin from "nodemailer-mjml";
import { join } from "path";
import { template } from "@babel/core";

class EmailSenderService extends AbstractNotificationService {
    static identifier = "email-sender"
    protected orderService: OrderService
    protected cartService: CartService
    protected host: string
    protected port: number
    protected username: string
    protected password: string
    protected email_from: string
    protected subject_order: string
    protected subject_customer: string
    protected customerTemplate: string
    protected orderTemplate: string
    protected dirname: string
    protected transporter

    constructor(container, options) {
        super(container)
        this.host = options.host
        this.port = options.port
        this.username = options.username
        this.password = options.password
        this.dirname = options.dirname
        this.email_from = options.email_from
        this.subject_order = options.order
        this.subject_customer = options.subject_customer
        this.orderTemplate = options.orderTemplate
        this.customerTemplate = options.customerTemplate
        this.orderService = container.orderService
        this.cartService = container.cartService
        this.transporter = nodemailer.createTransport({
            host: this.host,
            secure: true,
            port: this.port,
            auth: {
                user: this.username,
                pass: this.password,
            },
        });

        this.transporter.use(
            "compile",
            nodemailerMjmlPlugin({ templateFolder: join(__dirname, "template") })
        );
    }

    async sendNotification(
        event: string,
        data: any,
        attachmentGenerator: unknown
    ): Promise<{
        to: string;
        status: string;
        data: Record<string, unknown>;
    }> {

        if (event === "order.placed") {
            const order: Order = await this.orderService.retrieve(data.id)
            const cart: Cart = await this.cartService.retrieveWithTotals(order.cart_id)
            const items = order.items.map((item) => ({ title: item.title, thumbnail: item.thumbnail, price: (item.unit_price / 100).toLocaleString() }))

            await this.transporter.sendMail({
                from: this.email_from,
                to: data.email,
                subject: this.subject_order,
                templateName: this.orderTemplate,
                templateData: {
                    items: items,
                    total: `${cart.total.toLocaleString()}`
                }


            })
            return {
                to: order.email,
                status: "done",
                data: {
                    items: order.items,
                },
            }
        }
        if (event === "customer.created") {
            await this.transporter.sendMail({
                from: this.email_from,
                to: data.email,
                subject: this.subject_customer,
                templateName: this.customerTemplate,
                templateData: {
                    name: data.first_name,
                }


            })

            return {
                to: "",
                status: "done",
                data: {
                },
            }
        }

    }
    resendNotification(
        notification: unknown,
        config: unknown,
        attachmentGenerator: unknown
    ): Promise<{
        to: string;
        status: string;
        data: Record<string, unknown>;
    }> {
        throw new Error("Method not implemented.")
    }

}

export default EmailSenderService
