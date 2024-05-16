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
    protected dirname: string
    protected transporter

    constructor(container, options) {
        super(container)
        this.host = options.host
        this.port = options.port
        this.username = options.username
        this.password = options.password
        this.dirname = options.dirname

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

        console.log(__dirname)
        console.log("dir", join(__dirname, "template"))
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
                from: 'no-reply@owlbytech.com',
                to: data.email,
                subject: 'Zacal compra',
                templateName: "cartTemplate",
                templateData: {
                    items: items,
                    total: `${cart.total.toLocaleString()}`
                }


            }).then((data) => { console.log(data) }).catch((e) => { console.log(e) });

            return {
                to: order.email,
                status: "done",
                data: {
                    items: order.items,
                },
            }
        }
        if (event === "customer.created") {
            console.log(data)
            await this.transporter.sendMail({
                from: 'no-reply@owlbytech.com',
                to: data.email,
                subject: 'Bienvendio a zacal ',
                templateName: "customerTemplate",
                templateData: {
                    name: data.first_name,
                }


            }).then((data) => { console.log(data) }).catch((e) => { console.log(e) });



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
