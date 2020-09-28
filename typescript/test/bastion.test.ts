import {App} from "@aws-cdk/core";
import * as bastion from "../lib/bastion-linux";
import {SynthUtils} from "@aws-cdk/assert";
import * as vpc from "../lib/vpc";
import {createContext} from "vm";


test('Test Bastion host creation', () => {

    const app = new App();
    const stack = new bastion.BastionHost(app, 'BASTION');

    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});

test('Test Bastion host creation with HOME_IP', () => {

    const app = new App( {
        context: {
            "HOME_IP": "45.43.42.41",
        }
    } );
    const stack = new bastion.BastionHost(app, 'BASTION');

    /*
    expect(stack).toHaveResource('AWS::EC2::SecurityGroup', {
        SecurityGroupIngress: [
            {
            "CidrIp": "45.43.42.41/32"
            }
        ],
    });

     */


    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();


});