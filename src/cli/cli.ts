#!/usr/bin/env node
import commander from 'commander';

import { OptionModel } from './models';
import {
    ErrorTypes,
    FatalErrorModel,
    IRulesConfig,
    ReactI18nextLint,
    ResultCliModel,
    ResultModel,
    StatusCodes,
    ToggleRule
} from "./../core";

import { config } from './../core/config';
import { OptionsLongNames } from './enums';
import chalk from 'chalk';
import { parseJsonFile, getPackageJsonPath } from './utils';

const name: string = 'react-i18next-translation-checker';

// tslint:disable-next-line:no-any
const docs: any = {
    name,
    usage: '[options]',
    description: 'Simple CLI tools for check `react-i18next` keys in app',
    examples: `

Examples:

    $ ${name} -p ${config.defaultValues.projectPath} -l ${config.defaultValues.languagesPath}
    $ ${name} -p ${config.defaultValues.projectPath} -z ${ErrorTypes.disable} -v ${ErrorTypes.error}
    $ ${name} -p ${config.defaultValues.projectPath} -i ./src/assets/i18n/EN-us.json, ./src/app/app.*.{json}

`
};

class Cli {
    private cliClient: commander.CommanderStatic = commander;
    private cliOptions: OptionModel[] = [];

    constructor(options: OptionModel[]) {
        this.cliOptions = options;
    }

    public static run(options: OptionModel[]): void {
        const cli: Cli = new Cli(options);
        cli.init();
        cli.parse();
        cli.runCli();
    }

    public init(options: OptionModel[] = this.cliOptions): void {
        options.forEach((option: OptionModel) => {
            const optionFlag: string = option.getFlag();
            const optionDescription: string = option.getDescription();
            const optionDefaultValue: string | ErrorTypes | undefined = option.default;
            this.cliClient.option(optionFlag, optionDescription, optionDefaultValue);
        });

        // tslint:disable-next-line:no-any
        const packageJson: any = parseJsonFile(getPackageJsonPath());
        this.cliClient.version(packageJson.version);

        this.cliClient
            .name(docs.name)
            .usage(docs.usage)
            .description(docs.description)
            .on(`--${OptionsLongNames.help}`, () => {
                // tslint:disable-next-line:no-console
                console.log(docs.examples);
            });
    }

    public runCli(): void {
        try {
            // tslint:disable-next-line:no-any
            const options: any = this.cliClient.config ? parseJsonFile(this.cliClient.config) : this.cliClient;
            const projectPath: string = options.project;
            const languagePath: string = options.languages;
            const tsConfigPath: string = options.tsConfigPath;

            let deepSearch: ToggleRule;
            let optionIgnore: string;
            let optionEmptyKey: ErrorTypes;
            let optionViewsRule: ErrorTypes;
            let optionMaxWarning: number ;
            let optionZombiesRule: ErrorTypes;
            let optionIgnoredKeys: string[];
            let optionCustomRegExpToFindKeys: string[] | RegExp[];

            if (!!options.rules) {
                 deepSearch = options.rules.deepSearch;
                 optionIgnore = options.rules.ignore;
                 optionEmptyKey = options.rules.emptyKeys;
                 optionViewsRule =  options.rules.keysOnViews;
                 optionMaxWarning =  options.rules.maxWarning;
                 optionZombiesRule = options.rules.zombieKeys;
                 optionIgnoredKeys =  options.rules.ignoredKeys;
                 optionCustomRegExpToFindKeys = options.rules.customRegExpToFindKeys;
            } else {
                 deepSearch = options.deepSearch;
                 optionIgnore = options.ignore;
                 optionEmptyKey = options.emptyKeys;
                 optionViewsRule = options.keysOnViews;
                 optionMaxWarning =  options.maxWarning;
                 optionZombiesRule = options.zombieKeys;
                 optionIgnoredKeys = options.ignoredKeys;
                 optionCustomRegExpToFindKeys = options.customRegExpToFindKeys;
            }


            this.printCurrentVersion();

            if (options.project && options.languages) {
                this.runLint(
                    projectPath, languagePath, optionZombiesRule,
                    optionViewsRule, optionIgnore, optionMaxWarning, optionEmptyKey, deepSearch,
                    optionIgnoredKeys, optionCustomRegExpToFindKeys, tsConfigPath
                );
            } else {
                const cliHasError: boolean = this.validate();
                if (cliHasError) {
                    process.exit(StatusCodes.crash);
                } else {
                    this.cliClient.help();
                }
            }
        } catch (error) {
            // tslint:disable-next-line: no-console
            console.error(error);
            process.exitCode = StatusCodes.crash;
        } finally {
            process.exit();
        }
    }

    public parse(): void {
        this.cliClient.parse(process.argv);
    }

    private validate(): boolean {
        const requiredOptions: OptionModel[] = this.cliOptions.filter((option: OptionModel) => option.required);
        const missingRequiredOption: boolean = requiredOptions.reduce((accum: boolean, option: OptionModel) => {
            if (!this.cliClient[String(option.longName)]) {
                accum = false;
                // tslint:disable-next-line: no-console
                console.error(`Missing required argument: ${option.getFlag()}`);
            }
            return accum;
        }, false);

        return missingRequiredOption;
    }

    public runLint(
        project: string,
        languages: string,
        zombies?: ErrorTypes,
        views?: ErrorTypes,
        ignore?: string,
        maxWarning: number = 1,
        emptyKeys?: ErrorTypes,
        deepSearch?: ToggleRule,
        ignoredKeys: string[] = [],
        customRegExpToFindKeys: string[] | RegExp[] = [],
        tsConfigPath?: string,
    ): void {
            const errorConfig: IRulesConfig = {
                deepSearch: deepSearch || ToggleRule.disable,
                zombieKeys: zombies || ErrorTypes.warning,
                emptyKeys: emptyKeys || ErrorTypes.warning,
                keysOnViews: views || ErrorTypes.error,
                maxWarning,
                ignoredKeys,
                customRegExpToFindKeys,
            };
            const validationModel: ReactI18nextLint = new ReactI18nextLint(project, languages, ignore, errorConfig, tsConfigPath);
            const resultCliModel: ResultCliModel = validationModel.lint(maxWarning);
            const resultModel: ResultModel = resultCliModel.getResultModel();
            resultModel.printResult();
            resultModel.printSummery();

            process.exitCode = resultCliModel.exitCode();

            if (resultModel.hasError) {
                throw new FatalErrorModel(chalk.red(resultModel.message));
            }
    }

    private printCurrentVersion(): void {
        // tslint:disable-next-line:no-any
        const packageJson: any = parseJsonFile(getPackageJsonPath());
        // tslint:disable-next-line:no-console
        console.log(`Current version: ${packageJson.version}`);
    }
}

export { Cli };
